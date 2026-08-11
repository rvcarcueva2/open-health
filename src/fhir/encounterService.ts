import { randomUUID } from 'expo-crypto';
import { saveResource } from '../db/resourceRepository';
import { ENCOUNTER_CLASS_AMBULATORY, FHIREncounter } from '../models/Encounter';
import { queueCreate } from '../sync/syncQueue';

/**
 * Creates a new Encounter resource for a patient.
 * Used when recording vital signs or other clinical activities.
 */
export async function createEncounter(patientId: string): Promise<FHIREncounter> {
  const now = new Date().toISOString();

  const encounter: FHIREncounter = {
    resourceType: 'Encounter',
    id: randomUUID(),
    status: 'finished',
    class: ENCOUNTER_CLASS_AMBULATORY,
    subject: {
      reference: `Patient/${patientId}`,
    },
    period: {
      start: now,
      end: now,
    },
  };

  console.log('SAVING ENCOUNTER TO SQLITE', encounter.id);
  await saveResource(encounter);

  console.log('QUEUE ITEM CREATED FOR ENCOUNTER', encounter.id);
  await queueCreate(encounter.id);

  return encounter;
}
