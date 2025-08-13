import cron from "node-cron";
import dotenv from "dotenv";
import { getDailyAgentReportDao } from "../history/historyDao.js";
import { sendTelegramMessage } from "../../utils/telegramSender.js";

dotenv.config();

let isCronScheduled = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendMessageWithRetry(message, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendTelegramMessage(message);
      console.log(`Successfully sent message: ${message.slice(0, 50)}...`);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.data.parameters.retry_after || 5;
        console.warn(
          `Rate limit hit for message: ${message.slice(
            0,
            50
          )}..., retrying after ${retryAfter} seconds (Attempt ${attempt}/${maxRetries})`
        );
        await delay(retryAfter * 1000); 
        if (attempt === maxRetries) {
          console.error(
            `Max retries reached for message: ${message.slice(0, 50)}...`
          );
          return false;
        }
      } else {
        console.error(`Error sending message: ${error.message}`);
        return false;
      }
    }
  }
}

function splitMessage(message, maxLength = 4000) {
  const messages = [];
  let currentMessage = "";
  const lines = message.split("\n");

  for (const line of lines) {
    if (currentMessage.length + line.length + 1 > maxLength) {
      messages.push(currentMessage.trim());
      currentMessage = line + "\n";
    } else {
      currentMessage += line + "\n";
    }
  }
  if (currentMessage.trim()) {
    messages.push(currentMessage.trim());
  }
  return messages;
}

async function generateAndLogDailyReport(date) {
  const reports = await getDailyAgentReportDao();
  console.log(`Processing ${reports.length} agents for daily report`);
  const success = await sendMessageWithRetry(`📊 Daily Report (${date}) 📊`);
  if (!success) {
    console.error("Failed to send daily report header");
    return;
  }

  const batchSize = 1;
  const messageDelay = 2000; 

  for (let i = 0; i < reports.length; i += batchSize) {
    const batch = reports.slice(i, i + batchSize);
    let message = "";
    for (const r of batch) {
      const hasActiveClients =
        Array.isArray(r.active_client_ids) && r.active_client_ids.some(Boolean);
      const hasInactiveClients =
        Array.isArray(r.inactive_client_ids) &&
        r.inactive_client_ids.some(Boolean);

      const maxClientIds = 50; 
      const activeClientIds = hasActiveClients
        ? r.active_client_ids.slice(0, maxClientIds).join(", ") +
          (r.active_client_ids.length > maxClientIds ? "..." : "")
        : "0";
      const inactiveClientIds = hasInactiveClients
        ? r.inactive_client_ids.slice(0, maxClientIds).join(", ") +
          (r.inactive_client_ids.length > maxClientIds ? "..." : "")
        : "0";

      message +=
        `Agent name: ${r.agent_name}\n` +
        `🟢 Active clients: ${
          hasActiveClients
            ? `${r.active_clients_count} - ${activeClientIds}`
            : "0"
        }\n` +
        `🔴 Inactive clients: ${
          hasInactiveClients
            ? `${r.inactive_clients_count} - ${inactiveClientIds}`
            : "0"
        }\n\n`;
    }
    const messages = splitMessage(message, 4000);
    for (const msg of messages) {
      const success = await sendMessageWithRetry(msg);
      if (!success) {
        console.error(
          `Failed to send message for batch ${i / batchSize + 1}, agent: ${
            batch[0].agent_name
          }`
        );
      }
      await delay(messageDelay); 
    }
  }
  console.log(`Finished processing ${reports.length} agents`);
}

export function startUserFetchCron() {
  if (isCronScheduled) {
    console.log("Cron job is already scheduled");
    return;
  }

  cron.schedule(
    "0 35 6 * * *",
    () => {
      const date = new Date().toLocaleDateString("en-GB");
      console.log("Cron started at", date);
      generateAndLogDailyReport(date);
    },
    { timezone: "Asia/Dubai" }
  );

  isCronScheduled = true;
  console.log("Cron job scheduled");
}
