import cron from "node-cron";
import dotenv from "dotenv";
import {
  getDailyAgentReportDao,
  getUnassignedUsersReportDao,
} from "../history/historyDao.js";
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

async function generateAndSendUnassignedReport(date) {
  const reports = await getUnassignedUsersReportDao();
  console.log(`Processing ${reports.length} unassigned users`);

  if (!reports.length) {
    console.log("No unassigned users found");
    return;
  }

  const headerSuccess = await sendMessageWithRetry(
    `📌 Unassigned Users Report (${date}) 📌`
  );
  if (!headerSuccess) {
    console.error("Failed to send unassigned report header");
    return;
  }

  const messageDelay = 2000;

  for (const r of reports) {
    const hasActiveClients =
      Array.isArray(r.active_client_ids) && r.active_client_ids.length > 0;
    const hasInactiveClients =
      Array.isArray(r.inactive_client_ids) && r.inactive_client_ids.length > 0;

    const chunkIds = (ids) => {
      const lines = [];
      const maxPerLine = 50;
      for (let i = 0; i < ids.length; i += maxPerLine) {
        const chunk = ids.slice(i, i + maxPerLine).join(", ");
        lines.push(chunk);
      }
      return lines.join("\n");
    };

    let activeSection = `🟢 Active clients: ${
      hasActiveClients ? r.active_clients_count : "0"
    }\n`;
    if (hasActiveClients) {
      activeSection += chunkIds(r.active_client_ids) + "\n";
    }

    let inactiveSection = `🔴 Inactive clients: ${
      hasInactiveClients ? r.inactive_clients_count : "0"
    }\n`;
    if (hasInactiveClients) {
      inactiveSection += chunkIds(r.inactive_client_ids) + "\n";
    }

    let message = `Agent name: ${r.agent_name}\n${activeSection}\n${inactiveSection}\n`;

    const messages = splitMessage(message, 4000);
    for (const msg of messages) {
      const success = await sendMessageWithRetry(msg);
      if (!success) {
        console.error(`Failed to send message for unassigned users`);
      }
      await delay(messageDelay);
    }
  }
  console.log("Finished sending unassigned users report");
}
  

async function generateAndLogDailyReport(date) {
    const reports = await getDailyAgentReportDao();
     console.log(`Processing ${reports.length} agents for daily report`);
  const headerSuccess = await sendMessageWithRetry(
    `📊 Daily Report (${date}) 📊`
  );
  if (!headerSuccess) {
    console.error("Failed to send daily report header");
    return;
  }

  const batchSize = 1; 
  const messageDelay = 2000;

  for (let i = 0; i < reports.length; i += batchSize) {
    const batch = reports.slice(i, i + batchSize);
    for (const r of batch) {
      const hasActiveClients =
        Array.isArray(r.active_client_ids) && r.active_client_ids.length > 0;
      const hasInactiveClients =
        Array.isArray(r.inactive_client_ids) &&
        r.inactive_client_ids.length > 0;

      const chunkIds = (ids) => {
        const lines = [];
        const maxPerLine = 50;
        for (let j = 0; j < ids.length; j += maxPerLine) {
          const chunk = ids.slice(j, j + maxPerLine).join(", ");
          lines.push(chunk);
        }
        return lines.join("\n");
      };

      let activeSection = `🟢 Active clients: ${
        hasActiveClients ? r.active_clients_count : "0"
      }\n`;
      if (hasActiveClients) {
        activeSection += chunkIds(r.active_client_ids) + "\n";
      }

      let inactiveSection = `🔴 Inactive clients: ${
        hasInactiveClients ? r.inactive_clients_count : "0"
      }\n`;
      if (hasInactiveClients) {
        inactiveSection += chunkIds(r.inactive_client_ids) + "\n";
      }

      let message = `Agent name: ${r.agent_name}\n${activeSection}\n${inactiveSection}\n`;

      const messages = splitMessage(message, 4000);
      for (const msg of messages) {
        const success = await sendMessageWithRetry(msg);
        if (!success) {
          console.error(`Failed to send message for agent: ${r.agent_name}`);
        }
        await delay(messageDelay);
      }
    }
  }

  console.log(`Finished processing ${reports.length} agents`);

  // Send unassigned users after agents report
  await generateAndSendUnassignedReport(date);
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
      console.log("Cron started at", date);
      generateAndLogDailyReport(date);
      },
    { timezone: "Asia/Dubai" }
  );

  isCronScheduled = true;
  console.log("Cron job scheduled");
}
