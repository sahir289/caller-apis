import cron from "node-cron";
import dotenv from "dotenv";
import fsPromises from "fs/promises";
import {
  getDailyAgentReportDao,
  getUnassignedUsersReportDao,
} from "../history/historyDao.js";
import { sendTelegramDocument } from "../../utils/telegramSender.js";
import { sendTelegramMessage } from "../../utils/telegramSender.js";
import { generateCSV } from "../../utils/generatepdf.js";
import { getHourlyActiveClientsDao } from "../history/historyDao.js";
import {
  getHourlyHistoryAllAgentWiseUserIdsDao,
  getHourlyHistoryAllUserIdsDao,
} from "../history/historyDao.js";
dotenv.config();

let isCronScheduled = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendDocumentWithRetry(filePath, chatId, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await sendTelegramDocument(filePath, chatId);
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
    const csvSuccess = await sendDocumentWithRetry(
      csvFilePath,
      process.env.TELEGRAM_CHAT_DAILY_REPORT
    );
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

    const csvSuccess = await sendDocumentWithRetry(
      csvFilePath,
      process.env.TELEGRAM_CHAT_DAILY_REPORT
    );
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
    const csvSuccess = await sendDocumentWithRetry(
      csvFilePath,
      process.env.TELEGRAM_CHAT_DAILY_REPORT
    );
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
  // await generateAndSendWeeklyReport(date);
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
    const csvSuccess = await sendDocumentWithRetry(
      csvFilePath,
      process.env.TELEGRAM_CHAT_HOURLY_ACTIVE_CLIENTS_REPORT
    );
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
async function sendHourlyAgentWiseMessage() {
  try {
    const reports = await getHourlyHistoryAllAgentWiseUserIdsDao();
    if (!reports.length) {
      await sendTelegramMessage(
        "Hourly Summary: No activity recorded for today.",
        process.env.TELEGRAM_CHAT_HOURLY_AGENTS_CLIENTS
      );
      return;
    }

    // Current Indian time
    const indianTime = new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Kolkata",
    });

    const BATCH_SIZE = 4;
    let firstMessage = true;
    let message = "";

    for (let i = 0; i < reports.length; i++) {
      const agent = reports[i];

      const agentMsg =
        `🧑‍💼 Agent Name  :   ${agent.agent_name}\n` +
        `💰 Total Deposit  :  ₹${agent.total_deposit_amount}\n` +
        `💸 Total Withdrawal  :  ₹${agent.total_withdrawal_amount}\n` +
        `👥 Active Clients  :  ${agent.active_clients_count}\n\n`;

      // Agar first message hai to header add karo
      if (firstMessage && message === "") {
        message += `📊 Hourly Agent Summary (${indianTime})\n\n`;
      }

      message += agentMsg;

      // Har 4 agent ke baad send karo
      if ((i + 1) % BATCH_SIZE === 0) {
        await sendTelegramMessage(
          message,
          process.env.TELEGRAM_CHAT_HOURLY_AGENTS_CLIENTS
        );
        message = "";
        firstMessage = false; // baad ke messages me header nahi aayega
      }
    }

    // Agar last batch me 4 se kam agent rahe ho to bhejna
    if (message.length > 0) {
      await sendTelegramMessage(
        message,
        process.env.TELEGRAM_CHAT_HOURLY_AGENTS_CLIENTS
      );
    }
    console.log("Hourly summary message sent successfully.");
  } catch (error) {
    console.error("Error sending hourly summary message:", error.message);
  }
}


async function sendHourlySummaryAllClientsTotalData() {
  try {
    const row = await getHourlyHistoryAllUserIdsDao();
    if (!row) {
      await sendTelegramMessage(
        "Hourly Summary: No activity recorded for today.",
        process.env.TELEGRAM_CHAT_HOURLY_TOTAL_SUMMARY
      );
      return;
    }

    const MAX_MESSAGE_LENGTH = 2000;

    let message = `📊 Hourly Summary 📊\n\n`;
    message += `⏰ Time : ${row.time}\n\n`;
    message += `💰 Total Deposit : ₹${row.total_deposit_amount}\n\n`;
    message += `💸 Total Withdrawal : ₹${row.total_withdrawal_amount}\n\n`;
    message += `👥 Active Clients : ${row.user_count}\n\n`;
    await sendTelegramMessage(
      message,
      process.env.TELEGRAM_CHAT_HOURLY_TOTAL_SUMMARY
    );
    console.log("Hourly summary message sent successfully.");
  } catch (error) {
    console.error("Error sending hourly summary message:", error.message);
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
      const date = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Dubai",
      });
      // 1. Agent wise message
      sendHourlyAgentWiseMessage();
      console.log("Hourly Cron started Agents Clients at", date);
      // 2. All clients PDF report
      generateAndSendHourlyActiveClientsReport(date);
      console.log("Hourly Cron started All Clients pdf at", date);
      // 3. All clients summary
      sendHourlySummaryAllClientsTotalData();
      console.log("Hourly Cron started All Clients at", date);
    },
    { timezone: "Asia/Dubai" }
  );

  cron.schedule(
    "55 29 22 * * *",
    () => {
      const date = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Dubai",
      });
      // 3. All clients summary
      sendHourlySummaryAllClientsTotalData();
      console.log("Hourly Cron started All Clients at", date);
      // 1. Agent wise message
      sendHourlyAgentWiseMessage();
      console.log("Hourly Cron started Agents Clients at", date);
      // 2. All clients PDF report
      generateAndSendHourlyActiveClientsReport(date);
      console.log("Hourly Cron started All Clients pdf at", date);
    },
    { timezone: "Asia/Dubai" }
  );
  
  isCronScheduled = true;
  console.log("Cron jobs scheduled");
}

