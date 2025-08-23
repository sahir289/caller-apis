
import {
  createLoginUsersService,
  getLoginUserService,
    loginService,
  
} from "./loginService.js";
import { sendSuccess } from "../../utils/responseHandler.js";
export const createLoginUser = async (req, res) => {
  try {
      const payload = req.body;
      const newUser = await createLoginUsersService(payload);
    return sendSuccess(res, "Login User created successfully" ,newUser);
  } catch (error) {
    console.error("error creating login user", error)
    throw error;
  }
};


export const getLoginUser = async (req, res) => {
  try {
    const payload = req.body;
    const newUser = await getLoginUserService(payload);
    return sendSuccess(res, "get login users successfully", newUser);
  } catch (error) {
    console.error("error geting login user", error);
    throw error;
  }
};


export const loginController = async (req, res) => {
    try {
    const payload = req.body;
    const userLogin = await loginService(payload);
      return sendSuccess(res,"Login Successfully",userLogin);
  } catch (error) {
    console.error("failed login user", error);
    throw error;  }
};
  
