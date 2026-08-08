import { db } from "./database";

export function runMigrations() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      resourceType TEXT,
      data TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      resourceId TEXT,
      operation TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS terminology_codes (
      code TEXT PRIMARY KEY,
      display TEXT,
      system TEXT
    );
  `);
}