import { Injectable } from "@nestjs/common";
import { createHmac } from "crypto";
import { ROLE_LABELS, type UserRole } from "@smeta/shared";

type TelegramButton = {
  callbackData?: string;
  text: string;
  url?: string;
};

type TelegramReplyKeyboardButton = {
  requestContact?: boolean;
  text: string;
};

type TelegramSendMessageInput = {
  buttons?: TelegramButton[][];
  chatId: string;
  removeKeyboard?: boolean;
  replyKeyboard?: TelegramReplyKeyboardButton[][];
  text: string;
};

type DeepLinkContext = {
  kind: "home" | "request" | "order" | "finance" | "dealer" | "store" | "support" | "referral" | "login";
  ref?: string;
  role?: UserRole;
};

@Injectable()
export class TelegramBotService {
  async sendMessage(input: TelegramSendMessageInput) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan");
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      body: JSON.stringify({
        chat_id: input.chatId,
        disable_web_page_preview: true,
        reply_markup: input.buttons?.length
          ? {
              inline_keyboard: input.buttons.map((row) =>
                row.map((button) => ({
                  text: button.text,
                  ...(button.url ? { url: button.url } : {}),
                  ...(button.callbackData ? { callback_data: button.callbackData } : {})
                }))
              )
            }
          : input.replyKeyboard?.length
            ? {
                keyboard: input.replyKeyboard.map((row) =>
                  row.map((button) => ({
                    text: button.text,
                    ...(button.requestContact ? { request_contact: true } : {})
                  }))
                ),
                one_time_keyboard: true,
                resize_keyboard: true
              }
            : input.removeKeyboard
              ? {
                  remove_keyboard: true
                }
              : undefined,
        text: input.text
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const body = (await response.json().catch(() => null)) as { description?: string; ok?: boolean } | null;

    if (!response.ok || body?.ok === false) {
      throw new Error(`Telegram xabar yuborilmadi: ${response.status} ${body?.description ?? "noma'lum xato"}`);
    }

    return body;
  }

  async sendMessageIfConfigured(input: TelegramSendMessageInput) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return {
        skipped: true
      };
    }

    return this.sendMessage(input);
  }

  async answerCallbackQueryIfConfigured(callbackQueryId?: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || !callbackQueryId) {
      return {
        skipped: true
      };
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      body: JSON.stringify({
        callback_query_id: callbackQueryId
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const body = (await response.json().catch(() => null)) as { description?: string; ok?: boolean } | null;

    if (!response.ok || body?.ok === false) {
      throw new Error(`Telegram callback javobi yuborilmadi: ${response.status} ${body?.description ?? "noma'lum xato"}`);
    }

    return body;
  }

  buildMainMenu(input: { roles: UserRole[]; status: string }) {
    const buttons: TelegramButton[][] = [
      [
        {
          callbackData: "/status",
          text: "Profilim"
        }
      ]
    ];

    if (input.roles.includes("customer")) {
      buttons.push([
        {
          callbackData: "/requests",
          text: "So'rovlarim"
        }
      ]);
    }

    if (input.roles.includes("dealer")) {
      buttons.push([
        {
          callbackData: "/requests",
          text: "Mijoz so'rovlari"
        },
        {
          callbackData: "/earnings",
          text: "Daromadim"
        }
      ]);
    }

    if (input.roles.includes("store")) {
      buttons.push([
        {
          callbackData: "/requests",
          text: "Yangi so'rovlar"
        },
        {
          callbackData: "/orders",
          text: "Buyurtmalar",
        }
      ]);
    }

    if (input.roles.some((role) => ["admin", "finance", "superadmin"].includes(role))) {
      buttons.push([
        {
          callbackData: "/requests",
          text: "Admin ishlari"
        },
        {
          callbackData: "/notifications",
          text: "Xabarlar"
        }
      ]);
    }

    buttons.push([
      {
        callbackData: "/support",
        text: "Yordam markazi"
      }
    ]);

    return buttons;
  }

  buildApplicationButtons() {
    return [
      [
        {
          callbackData: "/apply_dealer",
          text: "Usta bo'lish"
        }
      ],
      [
        {
          callbackData: "/apply_store",
          text: "Do'kon bo'lish"
        }
      ]
    ];
  }

  buildApplicationHelpButtons() {
    return [
      [
        {
          callbackData: "/apply_store",
          text: "Do'kon bo'lish"
        },
        {
          callbackData: "/apply_dealer",
          text: "Usta bo'lish"
        }
      ],
      [
        {
          callbackData: "/status",
          text: "Profilim"
        },
        {
          callbackData: "/support",
          text: "Yordam markazi"
        }
      ]
    ];
  }

  buildProfileHelpButtons() {
    return [
      [
        {
          callbackData: "/status",
          text: "Profilim"
        },
        {
          callbackData: "/support",
          text: "Yordam markazi"
        }
      ]
    ];
  }

  roleStatusText(input: { displayName: string; roles: UserRole[]; status: string }) {
    const roleLabels = input.roles.map((role) => ROLE_LABELS[role]).join(", ");
    const statusText = input.status === "active" ? "tasdiqlangan" : input.status;

    return [`Salom, ${input.displayName}.`, `Holat: ${statusText}.`, `Rollar: ${roleLabels || "hali biriktirilmagan"}.`].join("\n");
  }

  loginSuccessButtons(nonce: string) {
    return [
      [
        {
          text: "Websitega qaytish",
          url: `${this.telegramWebAppUrl()}?loginNonce=${encodeURIComponent(nonce)}`
        }
      ]
    ];
  }

  webAppLink(context: DeepLinkContext) {
    const payload = Buffer.from(
      JSON.stringify({
        ...context,
        issuedAt: Date.now()
      })
    ).toString("base64url");
    const signature = createHmac("sha256", this.deepLinkSecret()).update(payload).digest("base64url");
    const url = new URL(this.telegramWebAppUrl());
    url.searchParams.set("tgContext", `${payload}.${signature}`);
    return url.toString();
  }

  verifyWebAppContext(token: string) {
    const [payload, signature] = token.split(".");

    if (!payload || !signature) {
      throw new Error("Telegram context noto'g'ri");
    }

    const expected = createHmac("sha256", this.deepLinkSecret()).update(payload).digest("base64url");

    if (signature !== expected) {
      throw new Error("Telegram context imzosi noto'g'ri");
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DeepLinkContext & {
      issuedAt?: number;
    };
    const maxAgeSeconds = Number(process.env.TELEGRAM_DEEP_LINK_MAX_AGE_SECONDS ?? 60 * 60 * 24 * 30);

    if (!parsed.issuedAt || Date.now() - parsed.issuedAt > maxAgeSeconds * 1000) {
      throw new Error("Telegram context muddati tugagan");
    }

    return parsed;
  }

  private deepLinkSecret() {
    return process.env.TELEGRAM_DEEP_LINK_SECRET || process.env.JWT_ACCESS_SECRET || "local-telegram-deep-link-secret";
  }

  private telegramWebAppUrl() {
    return (process.env.TELEGRAM_WEB_APP_URL ?? process.env.WEB_APP_URL ?? "http://localhost:5173").replace(/\/$/, "");
  }
}
