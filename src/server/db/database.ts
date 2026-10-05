// SQLite persistence (node:sqlite). One database holds accounts and characters; v1's flat
// accounts.json rewrite-on-every-save is gone.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface AccountRow {
  id: number;
  username: string;
  pass_hash: string;
  created_at: number;
}

export interface CharacterRow {
  account_id: number;
  name: string;
  data: string;
  updated_at: number;
}

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS accounts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL,
     username_lower TEXT NOT NULL UNIQUE,
     pass_hash TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     last_login_at INTEGER
   )`,
  `CREATE TABLE IF NOT EXISTS characters (
     account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     name_lower TEXT NOT NULL UNIQUE,
     data TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS houses (
     plot_id TEXT PRIMARY KEY,
     account_id INTEGER NOT NULL UNIQUE,
     owner_name TEXT NOT NULL,
     open INTEGER NOT NULL DEFAULT 0,
     bought_at INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS furniture (
     id TEXT PRIMARY KEY,
     plot_id TEXT NOT NULL,
     floor INTEGER NOT NULL,
     kind TEXT NOT NULL,
     x INTEGER NOT NULL,
     y INTEGER NOT NULL,
     rot INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS furniture_plot ON furniture(plot_id);
   CREATE TABLE IF NOT EXISTS house_storage (
     plot_id TEXT PRIMARY KEY,
     data TEXT NOT NULL
   )`
];

export interface HouseRow {
  plot_id: string;
  account_id: number;
  owner_name: string;
  open: number;
}

export interface FurnitureRow {
  id: string;
  plot_id: string;
  floor: number;
  kind: string;
  x: number;
  y: number;
  rot: number;
}

export class Store {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
    this.db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    const row = this.db.prepare("SELECT value FROM meta WHERE key = 'schema'").get() as { value: string } | undefined;
    const version = row ? Number(row.value) : 0;
    for (let i = version; i < MIGRATIONS.length; i += 1) {
      this.db.exec(MIGRATIONS[i]);
    }
    this.db.prepare("INSERT INTO meta (key, value) VALUES ('schema', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(MIGRATIONS.length));
  }

  findAccount(username: string): AccountRow | undefined {
    return this.db
      .prepare("SELECT id, username, pass_hash, created_at FROM accounts WHERE username_lower = ?")
      .get(username.toLowerCase()) as AccountRow | undefined;
  }

  createAccount(username: string, passHash: string): AccountRow {
    const now = Date.now();
    const result = this.db
      .prepare("INSERT INTO accounts (username, username_lower, pass_hash, created_at) VALUES (?, ?, ?, ?)")
      .run(username, username.toLowerCase(), passHash, now);
    return { id: Number(result.lastInsertRowid), username, pass_hash: passHash, created_at: now };
  }

  touchLogin(accountId: number): void {
    this.db.prepare("UPDATE accounts SET last_login_at = ? WHERE id = ?").run(Date.now(), accountId);
  }

  loadCharacter(accountId: number): CharacterRow | undefined {
    return this.db
      .prepare("SELECT account_id, name, data, updated_at FROM characters WHERE account_id = ?")
      .get(accountId) as CharacterRow | undefined;
  }

  isCharacterNameTaken(name: string): boolean {
    return Boolean(this.db.prepare("SELECT 1 FROM characters WHERE name_lower = ?").get(name.toLowerCase()));
  }

  saveCharacter(accountId: number, name: string, data: unknown): void {
    this.db
      .prepare(
        `INSERT INTO characters (account_id, name, name_lower, data, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .run(accountId, name, name.toLowerCase(), JSON.stringify(data), Date.now());
  }

  /** Save many characters in one transaction (periodic autosave). */
  saveCharacters(rows: { accountId: number; name: string; data: unknown }[]): void {
    if (!rows.length) return;
    this.db.exec("BEGIN");
    try {
      for (const row of rows) this.saveCharacter(row.accountId, row.name, row.data);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  // ── housing ──────────────────────────────────────────────────────────────

  allHouses(): HouseRow[] {
    return this.db.prepare("SELECT plot_id, account_id, owner_name, open FROM houses").all() as unknown as HouseRow[];
  }

  buyHouse(plotId: string, accountId: number, ownerName: string): void {
    this.db.prepare("INSERT INTO houses (plot_id, account_id, owner_name, open, bought_at) VALUES (?, ?, ?, 0, ?)").run(plotId, accountId, ownerName, Date.now());
  }

  sellHouse(plotId: string): void {
    this.db.prepare("DELETE FROM houses WHERE plot_id = ?").run(plotId);
    this.db.prepare("DELETE FROM furniture WHERE plot_id = ?").run(plotId);
    this.db.prepare("DELETE FROM house_storage WHERE plot_id = ?").run(plotId);
  }

  setHouseOpen(plotId: string, open: boolean): void {
    this.db.prepare("UPDATE houses SET open = ? WHERE plot_id = ?").run(open ? 1 : 0, plotId);
  }

  furnitureFor(plotId: string): FurnitureRow[] {
    return this.db.prepare("SELECT id, plot_id, floor, kind, x, y, rot FROM furniture WHERE plot_id = ?").all(plotId) as unknown as FurnitureRow[];
  }

  addFurniture(row: FurnitureRow): void {
    this.db.prepare("INSERT INTO furniture (id, plot_id, floor, kind, x, y, rot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(row.id, row.plot_id, row.floor, row.kind, row.x, row.y, row.rot);
  }

  removeFurniture(id: string): void {
    this.db.prepare("DELETE FROM furniture WHERE id = ?").run(id);
  }

  loadStorage(plotId: string): string | null {
    const row = this.db.prepare("SELECT data FROM house_storage WHERE plot_id = ?").get(plotId) as { data: string } | undefined;
    return row ? row.data : null;
  }

  saveStorage(plotId: string, data: unknown): void {
    this.db
      .prepare("INSERT INTO house_storage (plot_id, data) VALUES (?, ?) ON CONFLICT(plot_id) DO UPDATE SET data = excluded.data")
      .run(plotId, JSON.stringify(data));
  }

  counts(): { accounts: number; characters: number } {
    const a = this.db.prepare("SELECT COUNT(*) AS n FROM accounts").get() as { n: number };
    const c = this.db.prepare("SELECT COUNT(*) AS n FROM characters").get() as { n: number };
    return { accounts: Number(a.n), characters: Number(c.n) };
  }

  close(): void {
    this.db.close();
  }
}
