import cron from "node-cron";
import { getDailyAgentReportDao } from "../history/historyDao.js";
async function generateAndLogDailyReport(date) {
  const reports = await getDailyAgentReportDao();
  for (const r of reports) {
    console.log(
      `📊 Daily Report (Full Day): ${date} - Agent name: ${r.agent_name}\n`
    );
    console.log(`♂️  New Registrations: ${r.new_registrations}`);
    console.log(`🟢 First-time Depositors: ${r.first_time_depositors}`);
    console.log(`🔸 First-time Deposit Amount: ${r.first_time_deposit_amount}`);
    console.log(`🔁 Repeat Depositors: ${r.repeat_depositors}`);
    console.log(`🔸 Total Deposits: ${r.total_deposits}`);
    console.log(`🔸 Deposit Amount: ${r.deposit_amount}`);
    console.log(`🔸 Total Withdrawals: ${r.total_withdrawals}`);
    console.log(`🔸 Withdrawal Amount: ${r.withdrawal_amount}`);
    console.log(`🔸 Net Deposit: ${r.net_deposit}\n`);

    console.log(
      `Active client: ${r.active_clients} (those who played previous day)`
    );
    console.log(
      `Inactive clients: total-${r.inactive_clients} (those who have not played previous day)\n`
    );
  }
}

export function startUserFetchCron() {
  // cron.schedule(
  //   "*/10 * * * * *",
  //     () => {
  //       const date = new Date().toLocaleTimeString();
  //     console.log("Cron fired at", new Date().toLocaleTimeString());
  //     generateAndLogDailyReport(date);
  //   },
  //   { timezone: "Asia/Dubai" }
  // );
}

// CRON JOB format

// 📊 Daily Report (Full Day): 2025-08-10 - Agent name

// ♂️  New Registrations: 06
// 🟢 First-time Depositors: 11
// 🔸 First-time Deposit Amount: 2500
// 🔁 Repeat Depositors: 32
// 🔸 Total Deposits: 91
// 🔸 Deposit Amount: 243600.00
// 🔸 Total Withdrawals: 38
// 🔸 Withdrawal Amount: 138804.00
// 🔸 Net Deposit: 104796.00

// Active client: 34(those who have played previous day)
// inactive clients: total-34(those who have not played previous day)
