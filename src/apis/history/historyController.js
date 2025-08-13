import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { createhistoryService } from "./historyService.js";
import { convertToDateOnly } from "../../utils/dateConverter.js";

export const createhistory = async (req, res) => {
  try {
    const { company_name } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (![".xlsx", ".xls", ".csv"].includes(ext)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Unsupported file format" });
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    fs.unlinkSync(filePath);

    const newhistory = jsonData
      .map((transaction) => {
        let userId, date, credit, debit, isDeposit;
        const desc = String(transaction?.Description || "");
        const remark = String(transaction?.Remark || "");

        if (transaction["Date & Time"]) {
          const fromTo =
            String(transaction["From → To"] || "").split(" → ") || [];
          if (!fromTo.length) return null;

          isDeposit = desc.includes("Deposit ID");
          userId = isDeposit ? fromTo[1] : fromTo[0];
          date = transaction["Date & Time"];
          credit = parseFloat(transaction.Credit) || 0;
          debit = parseFloat(transaction.Debit) || 0;
        }
        // Pattern 2
        else if (transaction.Date) {
          const fromTo = String(transaction.Fromto || "").split("/") || [];
          if (!fromTo.length) return null;

          isDeposit = remark.includes("rry") || remark.includes("Bonus");
          userId = fromTo[1];
          date = transaction.Date;
          credit = parseFloat(transaction.Credit) || 0;
          debit = Math.abs(parseFloat(transaction.Debit)) || 0;
        } else {
          return null;
        }

        if (!userId) return null;

        const config = {};
        Object.keys(transaction).forEach((key) => {
          if (
            key !== "From → To" &&
            key !== "Fromto" &&
            key !== "Date & Time" &&
            key !== "Date" &&
            key !== "Credit" &&
            key !== "Debit"
          ) {
            config[key] = transaction[key];
          }
        });

        return {
          user_id: userId,
          company_name: company_name || null,
          registration_date: null,
          first_deposit_date:
            isDeposit && debit > 0 ? convertToDateOnly(date) : null,
          first_time_deposit_amount: isDeposit && debit > 0 ? debit : 0,
          number_of_deposits: isDeposit && debit > 0 ? 1 : 0,
          total_deposit_amount: isDeposit && debit > 0 ? debit : 0,
          total_winning_amount:
            !isDeposit && credit > 0
              ? (desc.includes("From PNL") &&
                  parseFloat(desc.match(/From PNL: (\d+\.?\d*)/)?.[1] || 0) >
                    0) ||
                remark.includes("wdv")
                ? credit
                : 0
              : 0,
          total_withdrawal_amount: !isDeposit && credit > 0 ? credit : 0,
          last_deposit_date:
            isDeposit && debit > 0 ? convertToDateOnly(date) : null,
          last_played_date: convertToDateOnly(date),
          user_status: null,
          available_points: 0,
          is_obsolete: false,
          config,
        };
      })
      .filter((user) => user !== null);
    const creatuser = await createhistoryService(newhistory);
    return res.status(201).json({
      message: "history created successfully",
      data: creatuser,
    });
  } catch (error) {
    console.error("Error in createhistory:", error);
    return res.status(500).json({ error: "Failed to create history" });
  }
};
