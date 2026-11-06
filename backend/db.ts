import { Database } from "@db/sqlite";

const DB_PATH = Deno.env.get("DB_PATH") ?? new URL("./data.sqlite", import.meta.url).pathname;

export function openDb(path = DB_PATH): Database {
  const db = new Database(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      duration TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_at TEXT NOT NULL UNIQUE,
      duration TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );
  `);
  return db;
}

export function parseDuration(duration: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(duration);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  if (mins <= 0 || mins % 15 !== 0) return null;
  return mins;
}

export function isValidStart(start: Date): boolean {
  // window 09:00-18:00 UTC, step 15 min; booking must fit in window
  const mins = start.getUTCHours() * 60 + start.getUTCMinutes();
  if (start.getUTCSeconds() !== 0 || start.getUTCMilliseconds() !== 0) return false;
  if (mins < 9 * 60 || mins > 18 * 60) return false;
  if (mins % 15 !== 0) return false;
  return true;
}

export function fitsInWindow(start: Date, durMins: number): boolean {
  const mins = start.getUTCHours() * 60 + start.getUTCMinutes();
  return mins + durMins <= 18 * 60;
}
