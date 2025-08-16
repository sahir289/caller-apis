import express from "express";
import { createCompany } from "./companiesContoller.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
const router = express.Router();
router.post("/createCompany",authMiddleware, createCompany);

export default router;
