
import { createRecordsDao, getRecordsDao } from "./recordsDao.js";


export const createRecordsService = async (payload) => {
  try {
    const createdRecord = await createRecordsDao(payload);
    return createdRecord;
  } catch (error) {
    console.error("Error in service while creating Records", error);
    throw error;
  }
};




export const getRecordsService = async (payload) => {
  try {
    const createdRecord = await getRecordsDao(payload);
    return createdRecord;
  } catch (error) {
    console.error("Error in service while getting Records", error);
    throw error;
  }
};