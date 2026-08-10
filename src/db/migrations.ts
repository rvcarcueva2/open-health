import barangaysData from "../data/templates/psgc-barangays.json";
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

    CREATE TABLE IF NOT EXISTS barangays (
      brgy_code TEXT PRIMARY KEY,
      brgy_name TEXT NOT NULL,
      city_code TEXT NOT NULL,
      province_code TEXT NOT NULL,
      region_code TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_barangays_city_code ON barangays(city_code);

    CREATE TABLE IF NOT EXISTS household_members (
      id TEXT PRIMARY KEY,
      householdId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      patientId TEXT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      isHead INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(householdId);
    CREATE INDEX IF NOT EXISTS idx_household_members_member ON household_members(memberId);
  `);

  // Seed barangays if table is empty
  seedBarangays();
}

function seedBarangays() {
  const count = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM barangays`
  );

  if (count && count.cnt > 0) {
    return; // Already seeded
  }

  console.log('SEEDING BARANGAYS — loading 42,029 records...');

  const BATCH_SIZE = 500;
  const data = barangaysData as any[];

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(',');
    const values = batch.flatMap((b) => [
      b.brgy_code,
      b.brgy_name,
      b.city_code,
      b.province_code,
      b.region_code,
    ]);

    db.runSync(
      `INSERT OR IGNORE INTO barangays (brgy_code, brgy_name, city_code, province_code, region_code) VALUES ${placeholders}`,
      values
    );
  }

  console.log('BARANGAYS SEEDED SUCCESSFULLY');
}
