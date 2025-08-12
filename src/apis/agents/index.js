import express from "express";
import multer from "multer";
import { createAgent, pairAgent } from "./agentsController.js";
const router = express.Router();


const upload = multer({ dest: "uploads/" }); 

router.post("/createAgent", createAgent);

router.post("/pairAgentwitUser",upload.single("file"), pairAgent);


export default router;
