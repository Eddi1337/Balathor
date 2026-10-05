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
   )`
];

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

  counts(): { accounts: number; characters: number } {
    const a = this.db.prepare("SELECT COUNT(*) AS n FROM accounts").get() as { n: number };
    const c = this.db.prepare("SELECT COUNT(*) AS n FROM characters").get() as { n: number };
    return { accounts: Number(a.n), characters: Number(c.n) };
  }

  close(): void {
    this.db.close();
  }
}
