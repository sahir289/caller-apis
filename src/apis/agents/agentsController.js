import { createAgentService, pairAgentService } from "./agentsService.js";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";

export const createAgent = async (req, res) => {
  try {
    const payload = req.body;
    const newUser = await createAgentService(payload);
    return res.status(201).json({
      message: "Agent created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create Agent" });
  }
};


export const pairAgent = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const supportedExtensions = [".xlsx", ".xls", ".csv", ".pdf"];
    if (!supportedExtensions.includes(ext)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Unsupported file format" });
    }
    let payload = [];
    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      payload = data;
    }
    if (ext === ".pdf") {
      payload = { pdfFilePath: filePath };
    }
    const newUser = await pairAgentService(payload);
    fs.unlinkSync(filePath);
    return res.status(201).json({
      message: "Agent created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error("Error in pairAgent:", error);
    return res.status(500).json({ error: "Failed to create Agent" });
  }
};