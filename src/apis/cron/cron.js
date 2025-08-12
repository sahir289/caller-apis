import cron from "node-cron";
import dotenv from "dotenv";
import { getDailyAgentReportDao } from "../history/historyDao.js";
import { sendTelegramMessage } from "../../utils/telegramSender.js";

dotenv.config();

let isCronScheduled = false; 



async function generateAndLogDailyReport(date) {
  const reports = await getDailyAgentReportDao();
  await sendTelegramMessage(`📊Daily Report (${date}) 📊`);
  const batchSize = 5;
  for (let i = 0; i < reports.length; i += batchSize) {
    const batch = reports.slice(i, i + batchSize);
    let message = "";
    for (const r of batch) {
      const hasActiveClients =
        Array.isArray(r.active_client_ids) && r.active_client_ids.some(Boolean);
      const hasInactiveClients =
        Array.isArray(r.inactive_client_ids) &&
        r.inactive_client_ids.some(Boolean);

      message +=
        `Agent name: ${r.agent_name}\n\n` +
        `🟢 Active clients: ${
          hasActiveClients
            ? `${r.active_clients_count} - ${r.active_client_ids.join(", ")}`
            : "0"
        }\n\n` +
        `🔴 Inactive clients: ${
          hasInactiveClients
            ? `${r.inactive_clients_count} - ${r.inactive_client_ids.join(
                ", "
              )}`
            : "0"
        }\n\n\n`;
    }

    await sendTelegramMessage(message.trim());
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
      console.log("Cron started at", date);
      generateAndLogDailyReport(date);
    },
    { timezone: "Asia/Dubai" }
  );

  isCronScheduled = true;
  console.log("Cron job scheduled");
}
