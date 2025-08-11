import express from "express";
import { createAgent } from "./agentsController.js";
const router = express.Router();

router.post("/createAgent", createAgent);

export default router;
