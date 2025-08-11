import dotenv from "dotenv";
dotenv.config({ path: ".env" });

function config(env) {
  return {
    environment: env?.NODE_ENV || "development",
    port: parseInt(env?.PORT) || 3000,
    database: {
      url: env?.DATABASE_URL,
    },
    aws: {
      region: env?.AWS_REGION || "us-east-1",
      accessKeyId: env?.AWS_ACCESS_KEY_ID,
      secretAccessKey: env?.AWS_SECRET_ACCESS_KEY,
      cloudWatchLogGroup: env?.AWS_LOG_GROUP_NAME,
      bucket: {
        name: env?.BUCKET_NAME,
        region: env?.BUCKET_REGION,
      },
    },
    telegram: {
      url: env?.TELEGRAM_URL,
      botToken: env?.TELEGRAM_BOT_TOKEN,
      ocrBotToken: env?.TELEGRAM_OCR_BOT_TOKEN,
      checkUtrBotToken: env?.TELEGRAM_CHECK_UTR_BOT_TOKEN,
      chatIds: {
        ratioAlerts: env?.TELEGRAM_RATIO_ALERTS_CHAT_ID,
        dashboard: env?.TELEGRAM_DASHBOARD_CHAT_ID,
        bankAlert: env?.TELEGRAM_BANK_ALERT_CHAT_ID,
        duplicateDispute: env?.TELEGRAM_DISPUTE_DUPLICATE_CHAT_ID,
        checkUtrHistory: env?.TELEGRAM_CHECK_UTR_HISTORY_CHAT_ID,
        ratioAlertsUpdated: env?.TELEGRAM_RATIO_ALERTS_CHAT_ID_UPDATED_DATA,
      },
    },
    frontend: {
      baseUrl: env?.REACT_FRONT_ORIGIN,
    },
  };
}

export default config(process.env);
