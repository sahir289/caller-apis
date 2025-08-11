import express from "express";
import { createCompany } from "./companiesContoller.js";
const router = express.Router();
router.post("/createCompany", createCompany);

export default router;
