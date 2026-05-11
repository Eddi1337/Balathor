"use strict";

/**
 * Built-in Incoming Webhook (account login / signup). Override with DISCORD_AUTH_WEBHOOK_URL — never revoke
 * lightly; if this repo is public, rotate this webhook in Discord and update this constant.
 */
const DEFAULT_DISCORD_AUTH_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1502756721146204291/V55qli-TkWmy3TiWm8WqPnfKDdyLPNUdGqHN_D7tSI-TcVgpnQLXczSt_tYxhfjDlL9F";

const WEBHOOK_HOSTS = new Set(["discord.com", "discordapp.com"]);
const FETCH_TIMEOUT_MS = 8000;

function isAllowedDiscordWebhookUrl(raw) {
  if (typeof raw !== "string") {
    return false;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") {
    return false;
  }
  if (!WEBHOOK_HOSTS.has(u.hostname)) {
    return false;
  }
  if (!/^\/api\/webhooks\/\d+\/.+/.test(u.pathname)) {
    return false;
  }
  return true;
}

function resolveDiscordAuthWebhookUrl() {
  const fromEnv = typeof process.env.DISCORD_AUTH_WEBHOOK_URL === "string"
    ? process.env.DISCORD_AUTH_WEBHOOK_URL.trim()
    : "";
  if (fromEnv) {
    if (isAllowedDiscordWebhookUrl(fromEnv)) {
      return fromEnv;
    }
    console.warn("Balathor: DISCORD_AUTH_WEBHOOK_URL invalid; using built-in Discord webhook");
  }
  return DEFAULT_DISCORD_AUTH_WEBHOOK_URL;
}

/** Discord code span — strip characters that break formatting. */
function escapeDiscordInline(s) {
  return String(s).replace(/`/g, "'");
}

/** Usernames that should never trigger Discord alerts (owner/admin accounts). */
function isSilencedUsername(name) {
  const lower = String(name || "").toLowerCase().trim();
  return lower === "mod_ed" || lower.startsWith("ed");
}

/**
 * Fire-and-forget POST to DiscordIncoming Webhook. Validates URL host + path only (Discord).
 * Username is sanitized server-side elsewhere; truncated defensively here.
 *
 * @param {string | undefined} webhookUrl
 * @param {{ event: 'create' | 'login'; username: string }} payload
 */
function postAuthEventToDiscord(webhookUrl, payload) {
  if (!webhookUrl || !isAllowedDiscordWebhookUrl(webhookUrl)) {
    return;
  }

  if (isSilencedUsername(payload.username)) {
    return;
  }

  const username = escapeDiscordInline(String(payload.username || "unknown")).slice(0, 72);
  const isCreate = payload.event === "create";
  /** Embed title drives Discord notification previews — lead with account name */
  const title = isCreate ? `${username} registered` : `${username} logged in`;
  const now = new Date();
  const timeIso = now.toISOString();
  const timeUtcReadable = now.toUTCString();
  const color = isCreate ? 0x5865f2 : 0x57f287;

  const body = {
    username: "Balathor",
    avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
    embeds: [
      {
        title,
        description: isCreate ? "Balathor: new account" : "Balathor: login",
        color,
        timestamp: timeIso,
        fields: [
          { name: "Username", value: `\`${username}\``, inline: true },
          { name: "Event", value: isCreate ? "Account created" : "Login", inline: true },
          { name: "Time (UTC)", value: `\`${escapeDiscordInline(timeIso)}\`\n_${escapeDiscordInline(timeUtcReadable)}_`, inline: false }
        ]
      }
    ]
  };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  fetch(webhookUrl.trim(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ac.signal
  })
    .then(async (res) => {
      clearTimeout(timer);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.warn(`[discordWebhook] Discord returned HTTP ${res.status}: ${txt.slice(0, 160)}`);
      }
    })
    .catch((err) => {
      clearTimeout(timer);
      const msg = err.name === "AbortError" ? "request timed out" : String(err.message || err);
      console.warn(`[discordWebhook] ${msg}`);
    });
}

module.exports = {
  postAuthEventToDiscord,
  isAllowedDiscordWebhookUrl,
  resolveDiscordAuthWebhookUrl
};
