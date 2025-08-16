
import {
  createLoginUsersService,
  getLoginUserService,
    loginService,
  
} from "./loginService.js";

export const createLoginUser = async (req, res) => {
  try {
      const payload = req.body;
      const newUser = await createLoginUsersService(payload);
    return res.status(201).json({
      message: "Login User created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create login User" });
  }
};


export const getLoginUser = async (req, res) => {
  try {
    const payload = req.body;
    const newUser = await getLoginUserService(payload);
    return res.status(201).json({
      message: "get login users successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create login  User" });
  }
};


export const loginController = async (req, res) => {
    try {
      
    const payload = req.body;
    const userLogin = await loginService(payload);
    return res.status(userLogin.status).json(userLogin);
  } catch (error) {
    return res.status(500).json({ error: "Failed to login User" });
  }
};
  
