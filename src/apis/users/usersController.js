
import { createUsersService } from "./usersService.js";
import { sendSuccess } from "../../utils/responseHandler.js";


export const createUser = async (req, res) => {
  try {
    const payload = req.body;
    const newUser = await createUsersService(payload);
    return sendSuccess(res, "User created successfully", newUser);
  } catch (error) {
    throw error;
  }
};