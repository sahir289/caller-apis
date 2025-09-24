import { createHash, verifyHash } from "../../utils/bcryptPassword.js";
import jwt from "jsonwebtoken";
import { BadRequestError, NotFoundError } from "../../utils/errorHandler.js";

import {
  createLoginUserDao,
  getLoginUserDao,
  getLoginByUserName,
} from "./loginDao.js";

export const createLoginUsersService = async (payload) => {
  try {
    const hashPassword = await createHash(payload.password);
    payload.password = hashPassword;
    const createdRecord = await createLoginUserDao(payload);
    return createdRecord;
  } catch (error) {
    console.error("Error in service while creating loginUser", error);
    throw error;
  }
};

export const getLoginUserService = async (payload) => {
  try {
    const createdRecord = await getLoginUserDao(payload);
    return createdRecord;
  } catch (error) {
    console.error("Error in service while creating loginUser", error);
    throw error;
  }
};

export const loginService = async (payload) => {
  try {
    const user = await getLoginByUserName({ user_name: payload?.user_name });
    if (!user) {
      throw new NotFoundError("Invalid credentials");
    }
    // Verify password
    const isValidPassword = await verifyHash(payload.password, user.password);
    if (!isValidPassword) {
      throw new BadRequestError("Invalid Password");
    }
    const tokenPayload = {
      user_name: user.user_name,
      id: user.id,
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    // Return both user and token
    return {
      user: {
        id: user.id,
        user_name: user.user_name,
        // add other user fields if needed
      },
      token: accessToken,
    };
  } catch (error) {
    console.error("Error in login service", error);
    throw error;
  }
};
