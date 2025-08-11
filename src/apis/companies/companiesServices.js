import { createCompanyDao } from "./companiesDao.js";

export const createCompanyService = async (payload) => {
    try {
    const createdRecord = await createCompanyDao(payload);
    return createdRecord;
  } catch (error) {
    console.error("Error in service while creating company", error);
    throw error;
  }
};
