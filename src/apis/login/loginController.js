import {
  createLoginUsersService,
  getLoginUserService,
  loginService,
} from "./loginService.js";
import { sendSuccess, RESPONSE_MESSAGES, STATUS_CODES } from "../../utils/responseHandler.js";
import { BadRequestError, UnauthorizedError } from "../../utils/errorHandler.js";

export const createLoginUser = async (req, res, next) => {
  try {
    const payload = req.body;
    
    if (!payload || !payload.username || !payload.password) {
      throw new BadRequestError("Username and password are required");
    }
    
    const newUser = await createLoginUsersService(payload);
    return sendSuccess(res, RESPONSE_MESSAGES.CREATED, newUser, STATUS_CODES.CREATED);
  } catch (error) {
    console.error("Error creating login user:", error);
    return next(error);
  }
};

export const getLoginUser = async (req, res, next) => {
  try {
    const payload = req.body;
    const users = await getLoginUserService(payload);
    return sendSuccess(res, RESPONSE_MESSAGES.RETRIEVED, users);
  } catch (error) {
    console.error("Error getting login users:", error);
    return next(error);
  }
};

export const loginController = async (req, res, next) => {
  try {
    const payload = req.body;
    
    if (!payload || !payload.user_name || !payload.password) {
      throw new BadRequestError("Username and password are required");
    }
    
    const userLogin = await loginService(payload);
    
    if (!userLogin) {
      throw new UnauthorizedError("Invalid username or password");
    }
    
    return sendSuccess(res, "Login successful", {
      user: userLogin.user,
      token: userLogin.token
    });
  } catch (error) {
    console.error("Login failed:", error);
    return next(error);
  }
};
