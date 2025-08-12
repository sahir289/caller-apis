import cron from "node-cron";
import dotenv from "dotenv";
import { getDailyAgentReportDao } from "../history/historyDao.js";
import { sendTelegramMessage } from "../../utils/telegramSender.js";
dotenv.config();

async function generateAndLogDailyReport(date) {
  const reports = await getDailyAgentReportDao();

  let message = `📊 *Daily Report (${date})* 📊\n\n`;

  for (const r of reports) {
    const hasActiveClients =
      Array.isArray(r.active_client_ids) && r.active_client_ids.some(Boolean);
    const hasInactiveClients =
      Array.isArray(r.inactive_client_ids) &&
      r.inactive_client_ids.some(Boolean);

    message += `*Agent name:* ${r.agent_name}\n`;
    message += `🟢 Active clients: ${
      hasActiveClients
        ? `${r.active_clients_count} - ${r.active_client_ids.join(", ")}`
        : "0"
    }\n`;
    message += `🔴 Inactive clients: ${
      hasInactiveClients
        ? `${r.inactive_clients_count} - ${r.inactive_client_ids.join(", ")}`
        : "0"
    }\n\n`;
  }

  await sendTelegramMessage(message);
}

export function startUserFetchCron() {
  cron.schedule(
    "*/10 * * * * *", 
    () => {
      const date = new Date().toLocaleDateString("en-GB");
      console.log("Cron started at", date);
      generateAndLogDailyReport(date);
    },
    { timezone: "Asia/Dubai" }
  );
}
