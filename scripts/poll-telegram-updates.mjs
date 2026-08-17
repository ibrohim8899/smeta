import { readFileSync } from "node:fs";

const env = readEnv();
const botToken = env.TELEGRAM_BOT_TOKEN;
const apiBaseUrl = env.API_PUBLIC_URL || `http://localhost:${env.API_PORT || "4000"}`;
const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET;
const intervalMs = Number(process.env.POLL_INTERVAL_MS || "3000");
const watch = process.argv.includes("--watch");

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing");
}

if (!webhookSecret) {
  throw new Error("TELEGRAM_WEBHOOK_SECRET is missing");
}

let offset = 0;

do {
  try {
    offset = await pollOnce(offset);
  } catch (error) {
    console.error(`telegram poll failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (watch) {
    await sleep(intervalMs);
  }
} while (watch);

async function pollOnce(currentOffset) {
  const updatesUrl = new URL(`https://api.telegram.org/bot${botToken}/getUpdates`);
  updatesUrl.searchParams.set("timeout", watch ? "10" : "0");
  updatesUrl.searchParams.set("limit", "25");

  if (currentOffset > 0) {
    updatesUrl.searchParams.set("offset", String(currentOffset));
  }

  const telegramResponse = await fetch(updatesUrl);

  if (!telegramResponse.ok) {
    throw new Error(`Telegram getUpdates failed: ${telegramResponse.status}`);
  }

  const telegramBody = await telegramResponse.json();

  if (!telegramBody.ok) {
    throw new Error("Telegram getUpdates returned ok=false");
  }

  let nextOffset = currentOffset;

  for (const update of telegramBody.result) {
    const text = update.message?.text || update.callback_query?.data || "";

    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/integrations/telegram/webhook/${encodeURIComponent(webhookSecret)}`, {
        body: JSON.stringify(update),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json().catch(() => ({}));

      console.log(`update=${update.update_id} text="${text}" status=${response.status} event=${result.eventType || result.status || "unknown"}`);
      nextOffset = Math.max(nextOffset, Number(update.update_id) + 1);
    } catch (error) {
      console.error(`update=${update.update_id} text="${text}" failed=${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (nextOffset > currentOffset) {
    const ackUrl = new URL(`https://api.telegram.org/bot${botToken}/getUpdates`);
    ackUrl.searchParams.set("offset", String(nextOffset));
    ackUrl.searchParams.set("limit", "1");
    await fetch(ackUrl);
  }

  return nextOffset;
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
