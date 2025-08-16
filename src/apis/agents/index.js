import express from "express";
import multer from "multer";
import { createAgent, pairAgent } from "./agentsController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
const router = express.Router();


const upload = multer({ dest: "uploads/" }); 

router.post("/createAgent",authMiddleware, createAgent);

router.post(
  "/pairAgentwitUser",
  authMiddleware,upload.single("file"),
  pairAgent
);


export default router;
