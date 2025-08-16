import express from "express";
import { createhistory } from "./historyController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
const router = express.Router();

import multer from "multer";

const upload = multer({ dest: "uploads/" }); // temporary folder to store uploaded files

router.post("/createhistory",authMiddleware, upload.single("file"), createhistory);

// router.post("/createhistory", createhistory);



export default router;
