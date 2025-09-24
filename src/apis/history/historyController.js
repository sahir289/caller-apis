// Node.js built-in modules
import path from "path";
import fs from "fs";

// Third-party packages
import XLSX from "xlsx";
import multer from 'multer';

// Internal utilities
import { sendSuccess, sendError, RESPONSE_MESSAGES, STATUS_CODES } from "../../utils/responseHandler.js"; 
import { BadRequestError } from "../../utils/errorHandler.js";

// Service imports
import { createhistoryService, createCSVImportService } from "./historyService.js";
import { parseExcelFile, parseCSVFile } from "./csvImportService.js";// Constants
const SUPPORTED_FILE_TYPES = ['.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

export const uploadCSV = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (SUPPORTED_FILE_TYPES.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  },
  limits: { fileSize: MAX_FILE_SIZE }
}).single('csvFile');

// Helper function to safely delete file
const safeDeleteFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn('Failed to cleanup file:', error.message);
  }
};

export const createhistory = async (req, res, next) => {
  let filePath;
  
  try {
    const { company_name } = req.body;
    
    if (!req.file) {
      throw new BadRequestError("No file uploaded");
    }
    
    if (!company_name) {
      throw new BadRequestError("Company name is required");
    }
    
    filePath = req.file.path;
    const fileName = req.file.originalname;
    const { id } = req.user;
    const ext = path.extname(fileName).toLowerCase();
    
    if (!SUPPORTED_FILE_TYPES.includes(ext)) {
      throw new BadRequestError(`Unsupported file format. Supported formats: ${SUPPORTED_FILE_TYPES.join(", ")}`);
    }
    
    // Get company by name to get company ID
    const { getCompanyDao } = await import("../companies/companiesDao.js");
    let company = await getCompanyDao({ name: company_name });
    if (!company) {
      const { createCompanyDao } = await import("../companies/companiesDao.js");
      company = await createCompanyDao({ name: company_name });
    }
    
    // Use the same logic as importCSVController
    const result = await createCSVImportService(filePath, company.id, ext);
    
    return sendSuccess(res, "History created successfully", {
      ...result,
      processedRecords: result.totalProcessed
    });
    
  } catch (error) {
    console.error("Error in createhistory:", error);
    return next(error);
  } finally {
    if (filePath) {
      safeDeleteFile(filePath);
    }
  }
};

export const importCSVController = async (req, res, next) => {
  let filePath;
  
  try {
    if (!req.file) {
      throw new BadRequestError("No CSV/Excel file uploaded");
    }

    const { companyId } = req.body;
    if (!companyId) {
      throw new BadRequestError("Company ID is required for import");
    }
    
    filePath = req.file.path;
    const fileName = req.file.originalname;
    const ext = path.extname(fileName).toLowerCase();
    
    const result = await createCSVImportService(filePath, companyId, ext);
    
    return sendSuccess(res, "Import completed successfully", result);
  } catch (error) {
    console.error("Import failed:", error);
    return next(error);
  } finally {
    if (filePath) {
      safeDeleteFile(filePath);
    }
  }
};
