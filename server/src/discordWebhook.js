"use strict";

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

/** Discord code span — strip characters that break formatting. */
function escapeDiscordInline(s) {
  return String(s).replace(/`/g, "'");
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

  const username = escapeDiscordInline(String(payload.username || "unknown")).slice(0, 72);
  const isCreate = payload.event === "create";
  const title = isCreate ? "New account" : "Login";
  const description = isCreate ? `\`${username}\` created an account.` : `\`${username}\` logged in.`;
  const color = isCreate ? 0x5865f2 : 0x57f287;

  const body = {
    username: "Balathor",
    avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
    embeds: [
      {
        title,
        description,
        color,
        timestamp: new Date().toISOString()
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
  isAllowedDiscordWebhookUrl
};
