import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { pipeline } from "stream/promises";
import { Transform } from "stream";

// Constants for optimization
const MAX_IDS_PER_COLUMN = 500;
const CHUNK_SIZE = 100; // Process records in chunks
const MAX_MEMORY_BUFFER = 10 * 1024 * 1024; // 10MB buffer limit

// Helper function to split IDs efficiently
const splitIdsByCount = (ids, maxPerCol = MAX_IDS_PER_COLUMN) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  
  const columns = [];
  for (let i = 0; i < ids.length; i += maxPerCol) {
    const chunk = ids.slice(i, i + maxPerCol)
      .filter(id => id !== null && id !== undefined)
      .join(",");
    
    if (chunk) columns.push(chunk);
  }
  return columns;
};

// Transform stream for processing CSV data in chunks
class CSVTransform extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.isFirst = true;
    this.buffer = [];
    this.chunkSize = options.chunkSize || CHUNK_SIZE;
  }

  _transform(report, encoding, callback) {
    try {
      const processedRow = this.processReportRow(report);
      this.buffer.push(processedRow);

      // Process in chunks to manage memory
      if (this.buffer.length >= this.chunkSize) {
        this.flushBuffer();
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    if (this.buffer.length > 0) {
      this.flushBuffer();
    }
    callback();
  }

  processReportRow(report) {
    const activeIds = Array.isArray(report.active_client_ids)
      ? report.active_client_ids.filter(id => id !== null && id !== undefined)
      : [];
    const inactiveIds = Array.isArray(report.inactive_client_ids)
      ? report.inactive_client_ids.filter(id => id !== null && id !== undefined)
      : [];

    const activeColumns = splitIdsByCount(activeIds);
    const inactiveColumns = splitIdsByCount(inactiveIds);

    const row = {
      agent: report.agent_name || 'N/A',
      total_clients: Number(report.active_clients_count || 0) + Number(report.inactive_clients_count || 0),
      active_count: Number(report.active_clients_count || 0),
      inactive_count: Number(report.inactive_clients_count || 0),
    };

    // Add active client columns
    activeColumns.forEach((val, i) => {
      row[`active_clients_${i + 1}`] = val;
    });

    // Add inactive client columns
    inactiveColumns.forEach((val, i) => {
      row[`inactive_clients_${i + 1}`] = val;
    });

    return row;
  }

  flushBuffer() {
    for (const row of this.buffer) {
      this.push(row);
    }
    this.buffer = [];
  }
}

// Optimized CSV generation with streaming
export async function generateCSV(reports, reportType, date) {
  if (!Array.isArray(reports) || reports.length === 0) {
    throw new Error("Reports data is required and must be a non-empty array");
  }

  const uploadsFolder = path.join(process.cwd(), "uploads");
  
  // Ensure uploads directory exists
  await fsPromises.mkdir(uploadsFolder, { recursive: true });
  
  const sanitizedDate = date.replace(/[\/\\:*?"<>|]/g, "-");
  const filePath = path.join(uploadsFolder, `${reportType}_report_${sanitizedDate}.csv`);

  try {
    // For small datasets, use synchronous processing
    if (reports.length <= CHUNK_SIZE) {
      return await generateCSVSync(reports, filePath);
    }

    // For large datasets, use streaming
    return await generateCSVStream(reports, filePath);
  } catch (error) {
    console.error(`Error generating CSV ${filePath}:`, error);
    
    // Cleanup on error
    try {
      await fsPromises.unlink(filePath);
    } catch (cleanupError) {
      console.warn(`Failed to cleanup file ${filePath}:`, cleanupError);
    }
    
    throw error;
  }
}

// Synchronous CSV generation for small datasets
async function generateCSVSync(reports, filePath) {
  const csvData = reports.map(report => {
    const activeIds = Array.isArray(report.active_client_ids)
      ? report.active_client_ids.filter(id => id !== null && id !== undefined)
      : [];
    const inactiveIds = Array.isArray(report.inactive_client_ids)
      ? report.inactive_client_ids.filter(id => id !== null && id !== undefined)
      : [];

    const activeColumns = splitIdsByCount(activeIds);
    const inactiveColumns = splitIdsByCount(inactiveIds);

    const row = {
      agent: report.agent_name || 'N/A',
      total_clients: Number(report.active_clients_count || 0) + Number(report.inactive_clients_count || 0),
      active_count: Number(report.active_clients_count || 0),
      inactive_count: Number(report.inactive_clients_count || 0),
    };

    activeColumns.forEach((val, i) => {
      row[`active_clients_${i + 1}`] = val;
    });

    inactiveColumns.forEach((val, i) => {
      row[`inactive_clients_${i + 1}`] = val;
    });

    return row;
  });

  // Generate headers dynamically
  const headersSet = new Set();
  csvData.forEach(row => Object.keys(row).forEach(k => headersSet.add(k)));
  const headers = Array.from(headersSet).sort();

  const csvString = Papa.unparse(csvData, { 
    header: true, 
    columns: headers,
    skipEmptyLines: true
  });

  await fsPromises.writeFile(filePath, csvString, "utf-8");
  return filePath;
}

// Streaming CSV generation for large datasets
async function generateCSVStream(reports, filePath) {
  const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  const transform = new CSVTransform({ chunkSize: CHUNK_SIZE });

  // Process first record to determine headers
  const firstRecord = new CSVTransform().processReportRow(reports[0]);
  const headers = Object.keys(firstRecord).sort();
  
  // Write CSV header
  const headerRow = Papa.unparse([headers], { header: false }) + '\n';
  writeStream.write(headerRow);

  let processedCount = 0;

  // Transform function for each report
  const processTransform = new Transform({
    objectMode: true,
    transform(report, encoding, callback) {
      try {
        const row = transform.processReportRow(report);
        const values = headers.map(header => row[header] || '');
        const csvRow = Papa.unparse([values], { header: false }) + '\n';
        
        processedCount++;
        
        callback(null, csvRow);
      } catch (error) {
        callback(error);
      }
    }
  });

  // Create readable stream from reports array
  const { Readable } = await import('stream');
  const reportsStream = Readable.from(reports);

  // Process the pipeline
  await pipeline(
    reportsStream,
    processTransform,
    writeStream
  );

  return filePath;
}
