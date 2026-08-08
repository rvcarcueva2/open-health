import { randomUUID } from 'expo-crypto';

import { saveResource }
  from '../db/resourceRepository';

import { queueCreate }
  from '../sync/syncQueue';

export async function createPatient(
  firstName: string,
  lastName: string
) {
  const patient = {
    resourceType: 'Patient',
    id: randomUUID(),
    active: true,

    name: [
      {
        family: lastName,
        given: [firstName],
      },
    ],
  };

  await saveResource(patient);

  await queueCreate(patient.id);

  return patient;
}