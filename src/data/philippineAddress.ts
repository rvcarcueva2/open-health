/**
 * Philippine Standard Geographic Code (PSGC) Address Service
 *
 * Complete PSGC dataset sourced from:
 * https://github.com/isaacdarcilla/philippine-addresses
 *
 * Data structure:
 *   - Regions (17) — imported directly
 *   - Provinces (88) — imported directly
 *   - Cities/Municipalities (1,647) — imported directly
 *   - Barangays (42,029) — loaded into SQLite for efficient querying
 *
 * System URI: https://psa.gov.ph/classification/psgc
 */

import { db } from '../db/database';
import citiesData from './templates/psgc-cities.json';
import provincesData from './templates/psgc-provinces.json';
import regionsData from './templates/psgc-regions.json';

export const PSGC_SYSTEM = 'https://psa.gov.ph/classification/psgc';

export interface AddressOption {
  code: string;
  display: string;
}

/**
 * Get all regions.
 */
export function getRegions(): AddressOption[] {
  return (regionsData as any[]).map((r) => ({
    code: r.region_code,
    display: r.region_name,
  }));
}

/**
 * Get provinces filtered by region code.
 * Deduplicates by province_code (some entries like NCR districts have duplicates).
 */
export function getProvincesByRegion(regionCode: string): AddressOption[] {
  const seen = new Set<string>();
  const results: AddressOption[] = [];

  for (const p of provincesData as any[]) {
    if (p.region_code === regionCode && !seen.has(p.province_code)) {
      seen.add(p.province_code);
      results.push({
        code: p.province_code,
        display: p.province_name,
      });
    }
  }

  return results;
}

/**
 * Get cities/municipalities filtered by province code.
 */
export function getCitiesByProvince(provinceCode: string): AddressOption[] {
  return (citiesData as any[])
    .filter((c) => c.province_code === provinceCode)
    .map((c) => ({
      code: c.city_code,
      display: c.city_name,
    }));
}

/**
 * Get barangays filtered by city code.
 * Queries from SQLite for performance (42,000+ records).
 */
export function getBarangaysByCity(cityCode: string): AddressOption[] {
  const rows = db.getAllSync<{ brgy_code: string; brgy_name: string }>(
    `SELECT brgy_code, brgy_name FROM barangays WHERE city_code = ? ORDER BY brgy_name`,
    [cityCode]
  );
  return rows.map((b) => ({
    code: b.brgy_code,
    display: b.brgy_name,
  }));
}
