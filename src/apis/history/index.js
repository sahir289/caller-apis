import express from "express";
import { createhistory, importCSVController, uploadCSV } from "./historyController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
import multer from "multer";

const router = express.Router();

const upload = multer({ dest: "uploads/" }); // temporary folder to store uploaded files

router.post("/createhistory", authMiddleware, upload.single("file"), createhistory);
router.post("/import-csv", authMiddleware, uploadCSV, importCSVController);

// router.post("/createhistory", createhistory);

export default router;
