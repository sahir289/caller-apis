import express from "express";
import { createUser } from "./usersController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
const router = express.Router();



router.post("/createUser",authMiddleware, createUser);




export default router;
