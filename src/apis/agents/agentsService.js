import { createAgentDao } from "./agentsDao.js";

export const createAgentService = async (payload) => {
  try {
    const createdRecord = await createAgentDao(payload);
    return createdRecord;
  } catch (error) {
    console.error("Error in service agent", error);
    throw error;
  }
};
