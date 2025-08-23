import { createRecordsService, getRecordsService } from "./recordsService.js";
import { sendSuccess } from "../../utils/responseHandler.js";


export const createRecords = async (req, res) => {
  try {
      const payload = req.body;
      const newUser = await createRecordsService(payload);
      return sendSuccess(res,"Records created successfully",newUser);
  } catch (error) {
    throw error;
  }
};


export const getRecords = async (req, res) => {
  try {
     const { page, size } = req.query;
      const filter = { page, size };
      const newUser = await getRecordsService(filter);
      return sendSuccess(res, "get records successfully", newUser);
  } catch (error) {
    throw error;
  }
};