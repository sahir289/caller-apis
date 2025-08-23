import { createCompanyService } from "./companiesServices.js";
import { sendSuccess } from "../../utils/responseHandler.js";

export const createCompany = async (req, res) => {
  try {
      const payload = req.body;
    const newCompany = await createCompanyService(payload);
    return sendSuccess(res, "Company created successfully", newCompany);
  } catch (error) {
    throw error
  }
};
