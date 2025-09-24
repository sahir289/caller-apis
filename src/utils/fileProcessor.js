import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import XLSX from "xlsx";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { Transform } from "stream";

// Constants for file processing optimization
const FILE_PROCESSING = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  SUPPORTED_EXTENSIONS: ['.csv', '.xlsx', '.xls', '.pdf'],
  TEMP_CLEANUP_TIMEOUT: 60000, // 1 minute
  BATCH_SIZE: 1000 // Records per batch
};

// File validation utility
export const validateFile = (file) => {
  if (!file) {
    throw new Error("No file provided");
  }

  const { originalname, size, path: filePath } = file;
  const ext = path.extname(originalname).toLowerCase();

  if (!FILE_PROCESSING.SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file format. Supported: ${FILE_PROCESSING.SUPPORTED_EXTENSIONS.join(', ')}`);
  }

  if (size > FILE_PROCESSING.MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${FILE_PROCESSING.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error("Uploaded file not found");
  }

  return { originalname, size, filePath, extension: ext };
};

// Safe file deletion with timeout
export const safeDeleteFile = (filePath, timeoutMs = FILE_PROCESSING.TEMP_CLEANUP_TIMEOUT) => {
  if (!filePath) return Promise.resolve();

  const deleteFile = async () => {
    try {
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
      }
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error.message);
    }
  };

  // Immediate cleanup
  deleteFile();

  // Delayed cleanup as backup
  setTimeout(deleteFile, timeoutMs);
};

// Stream-based CSV reader for large files
export class CSVStreamReader extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.batchSize = options.batchSize || FILE_PROCESSING.BATCH_SIZE;
    this.currentBatch = [];
    this.rowCount = 0;
    this.headers = null;
  }

  _transform(chunk, encoding, callback) {
    try {
      // Process chunk into rows
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          this.rowCount++;
          
          if (!this.headers) {
            this.headers = this.parseCSVLine(line);
            continue;
          }

          const row = this.parseCSVLine(line);
          const rowObject = this.createRowObject(this.headers, row);
          
          this.currentBatch.push(rowObject);

          if (this.currentBatch.length >= this.batchSize) {
            this.push({
              type: 'batch',
              data: [...this.currentBatch],
              batchNumber: Math.ceil(this.rowCount / this.batchSize)
            });
            this.currentBatch = [];
          }
        }
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    if (this.currentBatch.length > 0) {
      this.push({
        type: 'batch',
        data: [...this.currentBatch],
        batchNumber: Math.ceil(this.rowCount / this.batchSize),
        isLast: true
      });
    }

    this.push({
      type: 'summary',
      totalRows: this.rowCount - 1, // Exclude header
      totalBatches: Math.ceil((this.rowCount - 1) / this.batchSize)
    });

    callback();
  }

  parseCSVLine(line) {
    // Simple CSV parsing (can be replaced with more robust parser)
    return line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
  }

  createRowObject(headers, values) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.toLowerCase()] = values[index] || null;
    });
    return obj;
  }
}

// Optimized Excel/Spreadsheet processor
export const processSpreadsheetFile = async (filePath, options = {}) => {
  const { 
    sheetIndex = 0, 
    startRow = 0, 
    batchSize = FILE_PROCESSING.BATCH_SIZE,
    transformFn = (row) => row 
  } = options;

  try {
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      cellStyles: false,
      cellFormula: false
    });

    const sheetName = workbook.SheetNames[sheetIndex];
    if (!sheetName) {
      throw new Error(`Sheet at index ${sheetIndex} not found`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null,
      raw: false,
      range: startRow
    });

    if (!jsonData.length) {
      throw new Error("No data found in spreadsheet");
    }

    // Process in batches to manage memory
    const processedBatches = [];
    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      const processedBatch = batch
        .map(row => {
          // Normalize keys to lowercase
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            normalizedRow[key.toLowerCase()] = row[key];
          });
          return transformFn(normalizedRow);
        })
        .filter(row => row !== null && row !== undefined);

      processedBatches.push(processedBatch);
      
    }

    return {
      batches: processedBatches,
      totalRows: jsonData.length,
      totalBatches: processedBatches.length,
      summary: {
        fileName: path.basename(filePath),
        fileSize: (await fsPromises.stat(filePath)).size,
        sheetName,
        processedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error(`Error processing spreadsheet ${filePath}:`, error);
    throw new Error(`Failed to process spreadsheet: ${error.message}`);
  }
};

// Memory-efficient file reader with progress tracking
export const readFileInChunks = async (filePath, chunkSize = FILE_PROCESSING.CHUNK_SIZE) => {
  const stats = await fsPromises.stat(filePath);
  const totalSize = stats.size;
  
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = createReadStream(filePath, { highWaterMark: chunkSize });
    
    let bytesRead = 0;
    
    stream.on('data', (chunk) => {
      chunks.push(chunk);
      bytesRead += chunk.length;
      
    });
    
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        size: totalSize,
        chunks: chunks.length
      });
    });
    
    stream.on('error', reject);
  });
};

// Enhanced file cleanup with error handling
export const cleanupTempFiles = async (filePaths) => {
  if (!Array.isArray(filePaths)) {
    filePaths = [filePaths];
  }

  const cleanupPromises = filePaths
    .filter(filePath => filePath && typeof filePath === 'string')
    .map(async (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          await fsPromises.unlink(filePath);
          return { filePath, status: 'deleted' };
        }
        return { filePath, status: 'not_found' };
      } catch (error) {
        console.warn(`Failed to delete ${filePath}:`, error.message);
        return { filePath, status: 'error', error: error.message };
      }
    });

  const results = await Promise.allSettled(cleanupPromises);
  
  const summary = {
    total: results.length,
    deleted: 0,
    errors: 0,
    notFound: 0
  };

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      const { status } = result.value;
      if (status === 'deleted') summary.deleted++;
      else if (status === 'not_found') summary.notFound++;
      else if (status === 'error') summary.errors++;
    } else {
      summary.errors++;
    }
  });

  return summary;
};

// File upload progress tracking
export const trackFileUpload = (file) => {
  const startTime = Date.now();
  const { originalname, size } = file;
  
  return {
    fileName: originalname,
    fileSize: size,
    startTime,
    getProgress: () => ({
      fileName: originalname,
      fileSize: size,
      duration: Date.now() - startTime,
      speedMBps: size / (1024 * 1024) / ((Date.now() - startTime) / 1000)
    })
  };
};