import { db } from './database';

export interface StoredHouseholdMember {
  id: string;
  householdId: string;
  memberId: string;
  patientId: string | null;
  firstName: string;
  lastName: string;
  isHead: number;
}

/**
 * Save a household member record (tracks the link between household members and patients).
 */
export function saveHouseholdMember(params: {
  householdId: string;
  memberId: string;
  firstName: string;
  lastName: string;
  isHead: boolean;
  patientId?: string;
}) {
  db.runSync(
    `INSERT OR REPLACE INTO household_members (id, householdId, memberId, patientId, firstName, lastName, isHead)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.memberId, // Use memberId as the primary key
      params.householdId,
      params.memberId,
      params.patientId || null,
      params.firstName,
      params.lastName,
      params.isHead ? 1 : 0,
    ]
  );
}

/**
 * Link a patient ID to a household member.
 */
export function linkMemberToPatient(memberId: string, patientId: string) {
  db.runSync(
    `UPDATE household_members SET patientId = ? WHERE memberId = ?`,
    [patientId, memberId]
  );
}

/**
 * Get the patient ID linked to a household member (if any).
 */
export function getPatientIdForMember(memberId: string): string | null {
  const result = db.getFirstSync<{ patientId: string | null }>(
    `SELECT patientId FROM household_members WHERE memberId = ?`,
    [memberId]
  );
  return result?.patientId ?? null;
}

/**
 * Get all household members for a given household.
 */
export function getHouseholdMembers(householdId: string): StoredHouseholdMember[] {
  return db.getAllSync<StoredHouseholdMember>(
    `SELECT * FROM household_members WHERE householdId = ?`,
    [householdId]
  );
}

/**
 * Check if a member is already registered as a patient.
 */
export function isMemberRegisteredAsPatient(memberId: string): boolean {
  const result = db.getFirstSync<{ patientId: string | null }>(
    `SELECT patientId FROM household_members WHERE memberId = ?`,
    [memberId]
  );
  return !!result?.patientId;
}
