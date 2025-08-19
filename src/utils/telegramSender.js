import dotenv from "dotenv";
import axios from "axios";
import FormData from "form-data";
import fs from "fs"; 

dotenv.config();

export async function sendTelegramMessage(message ,chatId) {
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
      "Error sending message to Telegram:",
      error.response?.data || error.message
    );
    throw error; // Throw error to be handled by sendMessageWithRetry
  }
}
export async function sendTelegramDocument(filePath,chatId, maxRetries = 5) {
  const TELEGRAM_URL = process.env.TELEGRAM_URL;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.error("Missing Telegram credentials in .env");
    return false;
  }
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("document", fs.createReadStream(filePath));

      const telegramUrl = `${TELEGRAM_URL}${TELEGRAM_BOT_TOKEN}/sendDocument`;
      await axios.post(telegramUrl, form, { headers: form.getHeaders() });

      console.log(`Successfully sent PDF: ${filePath}`);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.data.parameters.retry_after || 5;
        console.warn(
          `Rate limit hit for PDF: ${filePath}, retrying after ${retryAfter} seconds (Attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        if (attempt === maxRetries) {
          console.error(`Max retries reached for PDF: ${filePath}`);
          return false;
        }
      } else {
        console.error(
          `Error sending PDF: ${error.response?.data || error.message}`
        );
        return false;
      }
    }
  }
  return false;
}
