// Optional Discord webhook notifications for account creation and logins.

import { config } from "./config";

const ALLOWED_HOSTS = new Set(["discord.com", "discordapp.com"]);

function webhookUrl(): string | null {
  if (!config.discordWebhookUrl) return null;
  try {
    const url = new URL(config.discordWebhookUrl);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function notifyAuthEvent(event: "created" | "login", username: string): void {
  const url = webhookUrl();
  if (!url) return;
  const safe = username.replace(/[`*_~|]/g, "");
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: event === "created" ? "New Balathor v2 account" : "Balathor v2 login",
          fields: [
            { name: "Username", value: safe || "(blank)", inline: true },
            { name: "Event", value: event, inline: true }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    }),
    signal: AbortSignal.timeout(8000)
  }).catch(() => undefined);
}
