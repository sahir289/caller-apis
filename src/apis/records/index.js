import express from "express";
import { createRecords,getRecords } from "./recordsController.js";

import authMiddleware from "../../middlewares/authMiddleware.js";
const router = express.Router();

router.get("/", authMiddleware, createRecords);


router.post("/createRecord", authMiddleware, createRecords);


export default router;
