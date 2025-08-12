import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

export async function sendTelegramMessage(message) {
  let chatId = process.env.TELEGRAM_CHAT_ID;
  const TELEGRAM_URL = process.env.TELEGRAM_URL;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.error("Missing Telegram credentials in .env");
    return;
  }

  try {
    const telegramUrl = `${TELEGRAM_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(telegramUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error(
      " Error sending message to Telegram:",
      error.response?.data || error.message
    );
  }
}
