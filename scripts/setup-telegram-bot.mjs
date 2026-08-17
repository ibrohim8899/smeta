import { readFileSync } from "node:fs";

const env = readEnv();
const botToken = env.TELEGRAM_BOT_TOKEN;
const apiPublicUrl = env.API_PUBLIC_URL;
const webAppUrl = env.WEB_APP_URL;
const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET;

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing");
}

await callTelegram("setMyCommands", {
  commands: [
    {
      command: "start",
      description: "Platformani boshlash"
    },
    {
      command: "login",
      description: "Website login kodini tasdiqlash"
    },
    {
      command: "menu",
      description: "Rol menyusini qayta ochish"
    },
    {
      command: "status",
      description: "Profil va rol holatini ko'rish"
    },
    {
      command: "requests",
      description: "So'rovlar bo'limini ochish"
    },
    {
      command: "orders",
      description: "Buyurtmalar bo'limini ochish"
    },
    {
      command: "earnings",
      description: "Usta reward yoki moliya bo'limi"
    },
    {
      command: "notifications",
      description: "Bildirishnomalar tarixini ochish"
    },
    {
      command: "support",
      description: "Yordam va dispute bo'limi"
    },
    {
      command: "apply_dealer",
      description: "Usta/dealer arizasi"
    },
    {
      command: "apply_store",
      description: "Do'kon arizasi"
    },
    {
      command: "help",
      description: "Bot buyruqlari"
    }
  ]
});

if (webAppUrl?.startsWith("https://")) {
  await callTelegram("setChatMenuButton", {
    menu_button: {
      text: "Platformani ochish",
      type: "web_app",
      web_app: {
        url: webAppUrl
      }
    }
  });
} else {
  await callTelegram("setChatMenuButton", {
    menu_button: {
      type: "commands"
    }
  });
}

if (apiPublicUrl?.startsWith("https://") && webhookSecret) {
  await callTelegram("setWebhook", {
    drop_pending_updates: false,
    secret_token: webhookSecret,
    url: `${apiPublicUrl.replace(/\/$/, "")}/integrations/telegram/webhook/${encodeURIComponent(webhookSecret)}`
  });
  console.log("Telegram bot commands/menu/webhook configured");
} else {
  console.log("Telegram bot commands/menu configured; webhook skipped because API_PUBLIC_URL or TELEGRAM_WEBHOOK_SECRET is missing");
}

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const body = await response.json();

  if (!body.ok) {
    throw new Error(`${method} failed: ${JSON.stringify(body)}`);
  }

  return body.result;
}

function readEnv() {
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  const values = {};

  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);

    if (match) {
      values[match[1].trim()] = match[2].trim();
    }
  }

  return values;
}
