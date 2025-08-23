import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { createhistoryService } from "./historyService.js";
import { convertToDateOnly } from "../../utils/dateConverter.js";
import { sendSuccess } from "../../utils/responseHandler.js"; 
import {BadRequestError} from "../../utils/errorHandler.js";

function getValidUserId(rawString, company_name) {
  let requiredBlockedUser = null;
  if (company_name === "Anna247") requiredBlockedUser = "admin";
  else if (company_name === "Anna777") requiredBlockedUser = "aganna777";
  const parts = rawString
    .split(/→|←|<-|->|\/|\\/) 
    .map((p) => p.trim())
    .filter(Boolean);
  if (
    requiredBlockedUser &&
    !parts.some((p) => p.toLowerCase() === requiredBlockedUser.toLowerCase())
  ) {
    throw new BadRequestError("Not a valid panel file"); 
  }
  return (
    parts.find(
      (p) => p.toLowerCase() !== (requiredBlockedUser?.toLowerCase() || "")
    ) || null
  );
}


export const createhistory = async (req, res) => {
  try {
    const { company_name } = req.body;
    if (!req.file) {
      throw new BadRequestError("No file uploaded");
    }
    const filePath = req.file.path;
    let fileName = req.file.originalname;
    let {id} = req.user;
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (![".xlsx", ".xls", ".csv"].includes(ext)) {
      fs.unlinkSync(filePath);
      throw new BadRequestError("Unsupported file format");
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    fs.unlinkSync(filePath);

    const newhistory = jsonData
      .map((transaction) => {
        let userId, date;
        const desc = String(transaction?.Description || "");
        const remark = String(transaction?.Remark || "");

        if (transaction["Date & Time"]) {
          const fromToStr = String(transaction["From → To"] || "");
          if (!fromToStr || fromToStr.trim() === "") return null;
          const fromToUser = getValidUserId(fromToStr, company_name);
          if (!fromToUser) return null;

          userId = fromToUser;
          date = transaction["Date & Time"];
          // DEBIT/CREDIT LOGIC ONLY
          const debit = parseFloat(transaction.Debit) || 0;
          const credit = parseFloat(transaction.Credit) || 0;

          return {
            user_id: userId,
            company_name: company_name || null,
            registration_date: null,
            first_deposit_date: debit > 0 ? convertToDateOnly(date) : null,
            first_time_deposit_amount: debit > 0 ? debit : 0,
            number_of_deposits: debit > 0 ? 1 : 0,
            total_deposit_amount: debit > 0 ? debit : 0,
            total_winning_amount: credit > 0 ? credit : 0,
            total_withdrawal_amount: credit > 0 ? credit : 0,
            last_deposit_date: debit > 0 ? convertToDateOnly(date) : null,
            last_played_date: convertToDateOnly(date),
            user_status: null,
            available_points: 0,
            is_obsolete: false,
            config: Object.fromEntries(
              Object.entries(transaction).filter(
                ([key]) =>
                  ![
                    "From → To",
                    "Fromto",
                    "Date & Time",
                    "Date",
                    "Credit",
                    "Debit",
                  ].includes(key)
              )
            ),
          };
        } else if (transaction.Date) {
          const fromToStr = String(transaction.Fromto || "");
          if (!fromToStr || fromToStr.trim() === "") return null;
          const fromToUser = getValidUserId(fromToStr, company_name);
          if (!fromToUser) return null;

          userId = fromToUser;
          date = transaction.Date;
          // DEBIT/CREDIT LOGIC ONLY
          const debit = Math.abs(parseFloat(transaction.Debit)) || 0;
          const credit = parseFloat(transaction.Credit) || 0;

          return {
            user_id: userId,
            company_name: company_name || null,
            registration_date: null,
            first_deposit_date: debit > 0 ? convertToDateOnly(date) : null,
            first_time_deposit_amount: debit > 0 ? debit : 0,
            number_of_deposits: debit > 0 ? 1 : 0,
            total_deposit_amount: debit > 0 ? debit : 0,
            total_winning_amount: credit > 0 ? credit : 0,
            total_withdrawal_amount: credit > 0 ? credit : 0,
            last_deposit_date: debit > 0 ? convertToDateOnly(date) : null,
            last_played_date: convertToDateOnly(date),
            user_status: null,
            available_points: 0,
            is_obsolete: false,
            config: Object.fromEntries(
              Object.entries(transaction).filter(
                ([key]) =>
                  ![
                    "From → To",
                    "Fromto",
                    "Date & Time",
                    "Date",
                    "Credit",
                    "Debit",
                  ].includes(key)
              )
            ),
          };
        } else {
          return null;
        }
      })
      .filter((user) => user !== null);
    const creatuser = await createhistoryService(newhistory,{id,fileName});
    console.log(`${company_name} History created successfully`);
    return sendSuccess(res, "history created successfully",creatuser);
  } catch (error) {
    console.error("Error in createhistory:", error);
    throw error;
  }
};
