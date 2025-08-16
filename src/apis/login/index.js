import express from "express";
import {
  createLoginUser,
  getLoginUser,
  loginController,
} from "./loginController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/createLogin", createLoginUser);

router.get("/", authMiddleware, getLoginUser);

router.post("/verify", loginController);

export default router;
