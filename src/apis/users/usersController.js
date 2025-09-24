
import { createUsersService } from "./usersService.js";
import { sendSuccess, RESPONSE_MESSAGES, STATUS_CODES } from "../../utils/responseHandler.js";

export const createUser = async (req, res, next) => {
  try {
    const payload = req.body;
    
    if (!payload || Object.keys(payload).length === 0) {
      const error = new Error("User data is required");
      error.status = 400;
      return next(error);
    }
    
    const newUser = await createUsersService(payload);
    return sendSuccess(res, RESPONSE_MESSAGES.CREATED, newUser, STATUS_CODES.CREATED);
  } catch (error) {
    console.error("Error creating user:", error);
    return next(error);
  }
};