import { createusersDao } from "./usersDao.js";


export const createUsersService = async (payload) => {
  try {
    const createdRecord = await createusersDao(payload);
    return createdRecord;
  } catch (error) {
    console.error("Error in service while creating User", error);
    throw error;
  }
};
