// Password hashing (scrypt) and credential validation.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LEN = 32;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function scryptAsync(pass: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pass, salt, KEY_LEN, PARAMS, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(pass: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pass, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pass: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scryptAsync(pass, Buffer.from(saltB64, "base64"));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export const CHARACTER_NAME_RE = /^[A-Za-z][A-Za-z0-9 '-]{1,15}$/;

export function validateCredentials(user: unknown, pass: unknown): string | null {
  if (typeof user !== "string" || !USERNAME_RE.test(user)) return "Username must be 3-16 letters, numbers or _";
  if (typeof pass !== "string" || pass.length < 6 || pass.length > 128) return "Password must be 6-128 characters";
  return null;
}
