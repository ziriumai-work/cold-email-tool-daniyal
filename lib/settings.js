// Simple key-value app settings (stored in the DB, shared across users).
import { get, run } from './db.js';

export async function getSetting(key, fallback = null) {
  const row = await get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}
