import { createAgentService, pairAgentService } from "./agentsService.js";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { sendSuccess } from "../../utils/responseHandler.js";
import { BadRequestError } from "../../utils/errorHandler.js";
export const createAgent = async (req, res) => {
  try {
    const payload = req.body;
    const newUser = await createAgentService(payload);
    return sendSuccess(res,"Agent created successfully",newUser)
  } catch (error) {
    console.error("error while creating user",error)
    throw error
  }
};


export const pairAgent = async (req, res) => {
  try {
    if (!req.file) {
      throw new BadRequestError("No file uploaded");
    }
    const filePath = req.file.path;
    let fileName = req.file.originalname;
    let { id } = req.user;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const supportedExtensions = [".xlsx", ".xls", ".csv", ".pdf"];
    if (!supportedExtensions.includes(ext)) {
      fs.unlinkSync(filePath);
      throw new BadRequestError("Unsupported file format");
    }
    let payload = [];
    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      payload = data.map((row) => {
        const newRow = {};
        for (let key in row) {
          newRow[key.toLowerCase()] = row[key];
        }
        return newRow;
      });
      if (
        payload.length === 0 ||
        !("userid" in payload[0]) ||
        !("agent" in payload[0])
      ) {
        fs.unlinkSync(filePath);
        throw new BadRequestError(
          "Invalid file: Please Upload Valid file"
        );
      }
    }
    if (ext === ".pdf") {
      payload = { pdffilepath: filePath }; 
    }
    fs.unlinkSync(filePath);
    const newUser = await pairAgentService(payload,{id,fileName});
    return sendSuccess(res, "Agent Paired with Users successfully", newUser);
  } catch (error) {
    console.error("Error in pairAgent:", error);
    throw error;
  }
};