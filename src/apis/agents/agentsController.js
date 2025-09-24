import { createAgentService, pairAgentService } from "./agentsService.js";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { sendSuccess, sendError, RESPONSE_MESSAGES, STATUS_CODES } from "../../utils/responseHandler.js";
import { BadRequestError } from "../../utils/errorHandler.js";

// Constants
const SUPPORTED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".pdf"];
const REQUIRED_CSV_FIELDS = ["userid", "agent"];

// Helper function to safely delete file
const safeDeleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

// Helper function to validate and process Excel/CSV files
const processSpreadsheetFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const payload = data.map((row) => {
      const newRow = {};
      for (let key in row) {
        newRow[key.toLowerCase()] = row[key];
      }
      return newRow;
    });

    // Validate required fields
    if (payload.length === 0 || 
        !REQUIRED_CSV_FIELDS.every(field => field in payload[0])) {
      throw new BadRequestError("Invalid file: Missing required fields (userid, agent)");
    }

    return payload;
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError("Error processing file: Invalid format or corrupted data");
  }
};

export const createAgent = async (req, res, next) => {
  try {
    const payload = req.body;
    const newAgent = await createAgentService(payload);
    return sendSuccess(res, RESPONSE_MESSAGES.CREATED, newAgent, STATUS_CODES.CREATED);
  } catch (error) {
    console.error("Error creating agent:", error);
    return next(error);
  }
};

export const pairAgent = async (req, res, next) => {
  let filePath;
  
  try {
    if (!req.file) {
      throw new BadRequestError("No file uploaded");
    }

    filePath = req.file.path;
    const fileName = req.file.originalname;
    const { id } = req.user;
    const ext = path.extname(fileName).toLowerCase();

    // Validate file extension
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new BadRequestError(`Unsupported file format. Supported formats: ${SUPPORTED_EXTENSIONS.join(", ")}`);
    }

    let payload;

    if ([".xlsx", ".xls", ".csv"].includes(ext)) {
      payload = processSpreadsheetFile(filePath);
    } else if (ext === ".pdf") {
      payload = { pdffilepath: filePath };
    }

    const result = await pairAgentService(payload, { id, fileName });
    
    return sendSuccess(res, "Agent paired with users successfully", result);
  } catch (error) {
    console.error("Error in pairAgent:", error);
    return next(error);
  } finally {
    // Clean up uploaded file
    if (filePath) {
      safeDeleteFile(filePath);
    }
  }
};