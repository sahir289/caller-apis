import { createRecordsService, getRecordsService } from "./recordsService.js";
import { sendSuccess, RESPONSE_MESSAGES, STATUS_CODES } from "../../utils/responseHandler.js";

// Constants
const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

export const createRecords = async (req, res, next) => {
  try {
    const payload = req.body;
    
    if (!payload || Object.keys(payload).length === 0) {
      const error = new Error("Record data is required");
      error.status = 400;
      return next(error);
    }
    
    const newRecord = await createRecordsService(payload);
    return sendSuccess(res, RESPONSE_MESSAGES.CREATED, newRecord, STATUS_CODES.CREATED);
  } catch (error) {
    console.error("Error creating record:", error);
    return next(error);
  }
};

export const getRecords = async (req, res, next) => {
  try {
    let { page = DEFAULT_PAGE, size = DEFAULT_SIZE } = req.query;
    
    // Validate and sanitize pagination parameters
    page = Math.max(1, parseInt(page) || DEFAULT_PAGE);
    size = Math.min(MAX_SIZE, Math.max(1, parseInt(size) || DEFAULT_SIZE));
    
    const filter = { page, size };
    const records = await getRecordsService(filter);
    
    return sendSuccess(res, RESPONSE_MESSAGES.RETRIEVED, {
      records: records.data || records,
      pagination: {
        page,
        size,
        total: records.total || 0
      }
    });
  } catch (error) {
    console.error("Error retrieving records:", error);
    return next(error);
  }
};