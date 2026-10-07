// Runtime configuration, all from environment variables with safe defaults.

function int(name: string, fallback: number, min: number, max: number): number {
  const v = Number(process.env[name]);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

export const config = {
  host: process.env.HOST || "0.0.0.0",
  port: int("PORT", 8080, 1, 65535),
  dataDir: process.env.DATA_DIR || "data",
  publicDir: process.env.PUBLIC_DIR || "dist/public",
  tickRate: int("TICK_RATE", 20, 10, 60),
  snapRate: int("SNAPSHOT_RATE", 10, 5, 30),
  maxClients: int("MAX_CLIENTS", 300, 1, 5000),
  /** Area-of-interest radius (tiles) for replication. */
  aoiRadius: int("AOI_RADIUS", 38, 16, 96),
  saveIntervalMs: int("SAVE_INTERVAL_MS", 30_000, 5_000, 600_000),
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
  /** Enables /tp and /time chat commands. Never set in production. */
  devCommands: process.env.DEV_COMMANDS === "1",
  /**
   * Moderators: account usernames or character names (comma-separated, case-insensitive). Mods get
   * unlimited gold, every ship, map-click teleport, /godmode, /teleport, /summon and the dev commands.
   */
  moderators: new Set((process.env.MODERATORS ?? "Eddi").split(",").map((n) => n.trim().toLowerCase()).filter(Boolean)),
  /** Real milliseconds per in-game day. */
  dayLengthMs: int("DAY_LENGTH_MS", 24 * 60 * 1000, 60_000, 24 * 60 * 60 * 1000)
};
