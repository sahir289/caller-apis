import cron from "node-cron";
import dotenv from "dotenv";
import fsPromises from "fs/promises";
import {
  getDailyAgentReportDao,
  getUnassignedUsersReportDao,
} from "../history/historyDao.js";
import { sendTelegramDocument } from "../../utils/telegramSender.js";
import { generateCSV } from "../../utils/generatepdf.js";
import { getHourlyActiveClientsDao } from "../history/historyDao.js";

dotenv.config();

let isCronScheduled = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendDocumentWithRetry(filePath, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await sendTelegramDocument(filePath);
      if (success) {
        console.log(`Successfully sent document: ${filePath}`);
        return true;
      }
      console.warn(
        `Failed to send document: ${filePath}, retrying (Attempt ${attempt}/${maxRetries})`
      );
      const retryAfter = attempt * 2; // Exponential backoff
      await delay(retryAfter * 1000);
      if (attempt === maxRetries) {
        console.error(`Max retries reached for document: ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error(`Error sending document ${filePath}: ${error.message}`);
      return false;
    }
  }
}

async function generateAndSendUnassignedReport(date) {
    const reports = await getUnassignedUsersReportDao();
  console.log(`Processing ${reports.length} unassigned users`);
  if (!reports.length) {
    console.log("No unassigned users found");
    return;
  }

  try {
    const csvFilePath = await generateCSV(reports, "unassigned", date);
    const csvSuccess = await sendDocumentWithRetry(csvFilePath);
    if (!csvSuccess) {
      console.error("Failed to send unassigned report CSV");
    }
    await fsPromises
      .unlink(csvFilePath)
      .catch((err) =>
        console.error(`Failed to delete CSV ${csvFilePath}: ${err.message}`)
      );
  } catch (err) {
    console.error(`Error generating unassigned report CSV: ${err.message}`);
  }
}

async function generateAndSendWeeklyReport(date) {
  try {
    const csvFilePath = "./7 days users (2).csv";
    console.log(`Processing CSV file: ${csvFilePath}`);

    const csvSuccess = await sendDocumentWithRetry(csvFilePath);
    if (!csvSuccess) {
      console.error("Failed to send weekly report CSV");
    }
    console.log("Finished sending weekly users report");
  } catch (err) {
    console.error(`Error processing weekly report: ${err.message}`);
  }
}

async function generateAndLogDailyReport(date) {
  const reports = await getDailyAgentReportDao();
  console.log(`Processing ${reports.length} agents for daily report`);
  try {
    const csvFilePath = await generateCSV(reports, "daily", date);
    const csvSuccess = await sendDocumentWithRetry(csvFilePath);
    if (!csvSuccess) {
      console.error("Failed to send daily report CSV");
    }
    await fsPromises
      .unlink(csvFilePath)
      .catch((err) =>
        console.error(`Failed to delete CSV ${csvFilePath}: ${err.message}`)
      );
  } catch (err) {
    console.error(`Error generating daily report CSV: ${err.message}`);
  }

  await generateAndSendUnassignedReport(date);
  await generateAndSendWeeklyReport(date);
}
async function generateAndSendHourlyActiveClientsReport(date) {
  const reports = await getHourlyActiveClientsDao();
  console.log(`Processing ${reports.length} active clients for hourly report`);
  if (!reports.length) {
    console.log("No active clients found in this hour");
    return;
  }

  try {
    const csvFilePath = await generateCSV(
      reports,
      "hourly-active-clients",
      date
    );
    const csvSuccess = await sendDocumentWithRetry(csvFilePath);
    if (!csvSuccess) {
      console.error("Failed to send hourly active clients report CSV");
    }
    await fsPromises
      .unlink(csvFilePath)
      .catch((err) =>
        console.error(`Failed to delete CSV ${csvFilePath}: ${err.message}`)
      );
  } catch (err) {
    console.error(`Error generating hourly active clients CSV: ${err.message}`);
  }
}

export function startUserFetchCron() {
  if (isCronScheduled) {
    console.log("Cron job is already scheduled");
    return;
  }

  cron.schedule(
    "0 0 6 * * *",
    () => {
      const date = new Date().toLocaleDateString("en-GB");
      console.log("Daily Cron started at", date);
      generateAndLogDailyReport(date);
    },
    { timezone: "Asia/Dubai" }
  );
  cron.schedule(
    "0 * * * *",
    () => {
      const date = new Date().toLocaleString("en-GB");
      console.log("Hourly Cron started at", date);
      // getHourlyActiveClientsDao();
      generateAndSendHourlyActiveClientsReport(date);
    },
    { timezone: "Asia/Dubai" }
  );

  isCronScheduled = true;
  console.log("Cron jobs scheduled");
}

