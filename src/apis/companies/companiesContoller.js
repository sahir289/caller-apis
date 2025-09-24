import { createCompanyService } from "./companiesServices.js";
import { sendSuccess, RESPONSE_MESSAGES, STATUS_CODES } from "../../utils/responseHandler.js";
import { BadRequestError } from "../../utils/errorHandler.js";

export const createCompany = async (req, res, next) => {
  try {
    const payload = req.body;
    
    if (!payload || Object.keys(payload).length === 0) {
      throw new BadRequestError("Company data is required");
    }
    
    if (!payload.name) {
      throw new BadRequestError("Company name is required");
    }
    
    const newCompany = await createCompanyService(payload);
    return sendSuccess(res, RESPONSE_MESSAGES.CREATED, newCompany, STATUS_CODES.CREATED);
  } catch (error) {
    console.error("Error creating company:", error);
    return next(error);
  }
};
