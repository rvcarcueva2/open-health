import { randomUUID } from 'expo-crypto';
import { db } from '../db/database';
import { saveResource, StoredResource } from '../db/resourceRepository';
import {
    FHIRObservation,
    VITAL_SIGN_CATEGORY,
    VITAL_SIGN_CODES,
    VitalSignsFormData,
} from '../models/Observation';
import { queueCreate } from '../sync/syncQueue';

/**
 * Creates Observation resources from vital signs form data.
 * Each measurement becomes a separate FHIR Observation, except blood pressure
 * which uses components.
 */
export async function createVitalSignObservations(
  patientId: string,
  encounterId: string,
  formData: VitalSignsFormData
): Promise<FHIRObservation[]> {
  const observations: FHIRObservation[] = [];
  const now = new Date().toISOString();

  // Blood Pressure (systolic + diastolic as components)
  if (formData.systolic && formData.diastolic) {
    const bp = buildBloodPressureObservation(
      patientId,
      encounterId,
      parseFloat(formData.systolic),
      parseFloat(formData.diastolic),
      now
    );
    observations.push(bp);
  }

  // Temperature
  if (formData.temperature) {
    const temp = buildSimpleObservation(
      patientId,
      encounterId,
      VITAL_SIGN_CODES.temperature,
      parseFloat(formData.temperature),
      'Cel',
      '°C',
      now
    );
    observations.push(temp);
  }

  // Heart Rate
  if (formData.heartRate) {
    const hr = buildSimpleObservation(
      patientId,
      encounterId,
      VITAL_SIGN_CODES.heartRate,
      parseFloat(formData.heartRate),
      '/min',
      'bpm',
      now
    );
    observations.push(hr);
  }

  // Respiratory Rate
  if (formData.respiratoryRate) {
    const rr = buildSimpleObservation(
      patientId,
      encounterId,
      VITAL_SIGN_CODES.respiratoryRate,
      parseFloat(formData.respiratoryRate),
      '/min',
      'breaths/min',
      now
    );
    observations.push(rr);
  }

  // Weight
  if (formData.weight) {
    const weight = buildSimpleObservation(
      patientId,
      encounterId,
      VITAL_SIGN_CODES.weight,
      parseFloat(formData.weight),
      'kg',
      'kg',
      now
    );
    observations.push(weight);
  }

  // Height
  if (formData.height) {
    const height = buildSimpleObservation(
      patientId,
      encounterId,
      VITAL_SIGN_CODES.height,
      parseFloat(formData.height),
      'cm',
      'cm',
      now
    );
    observations.push(height);
  }

  // Oxygen Saturation
  if (formData.oxygenSaturation) {
    const spo2 = buildSimpleObservation(
      patientId,
      encounterId,
      VITAL_SIGN_CODES.oxygenSaturation,
      parseFloat(formData.oxygenSaturation),
      '%',
      '%',
      now
    );
    observations.push(spo2);
  }

  // Save all observations to SQLite and queue for sync
  for (const obs of observations) {
    console.log('SAVING OBSERVATION TO SQLITE', obs.id);
    await saveResource(obs);

    console.log('QUEUE ITEM CREATED FOR OBSERVATION', obs.id);
    await queueCreate(obs.id);
  }

  return observations;
}

function buildBloodPressureObservation(
  patientId: string,
  encounterId: string,
  systolic: number,
  diastolic: number,
  dateTime: string
): FHIRObservation {
  return {
    resourceType: 'Observation',
    id: randomUUID(),
    status: 'final',
    category: [{ coding: [VITAL_SIGN_CATEGORY] }],
    code: {
      coding: [VITAL_SIGN_CODES.bloodPressure],
      text: 'Blood Pressure',
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: dateTime,
    component: [
      {
        code: { coding: [VITAL_SIGN_CODES.systolic] },
        valueQuantity: {
          value: systolic,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
      {
        code: { coding: [VITAL_SIGN_CODES.diastolic] },
        valueQuantity: {
          value: diastolic,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
    ],
  };
}

function buildSimpleObservation(
  patientId: string,
  encounterId: string,
  code: { system: string; code: string; display: string },
  value: number,
  ucumCode: string,
  displayUnit: string,
  dateTime: string
): FHIRObservation {
  return {
    resourceType: 'Observation',
    id: randomUUID(),
    status: 'final',
    category: [{ coding: [VITAL_SIGN_CATEGORY] }],
    code: {
      coding: [code],
      text: code.display,
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: dateTime,
    valueQuantity: {
      value,
      unit: displayUnit,
      system: 'http://unitsofmeasure.org',
      code: ucumCode,
    },
  };
}

/**
 * Gets all vital sign observations for a patient, ordered by most recent first.
 */
export function getVitalSignsForPatient(patientId: string): FHIRObservation[] {
  const results = db.getAllSync<StoredResource>(
    `SELECT * FROM resources WHERE resourceType = 'Observation' ORDER BY rowid DESC`
  );

  const observations: FHIRObservation[] = [];

  for (const row of results) {
    const obs: FHIRObservation = JSON.parse(row.data);
    if (obs.subject?.reference === `Patient/${patientId}`) {
      // Check it's a vital sign category
      const isVitalSign = obs.category?.some((cat) =>
        cat.coding.some((c) => c.code === 'vital-signs')
      );
      if (isVitalSign) {
        observations.push(obs);
      }
    }
  }

  return observations;
}

/**
 * Gets the latest set of vital signs for a patient grouped by encounter.
 */
export function getLatestVitalSigns(patientId: string) {
  const allObs = getVitalSignsForPatient(patientId);

  if (allObs.length === 0) return null;

  // Find the most recent encounter
  const latestEncounterRef = allObs[0]?.encounter?.reference;
  if (!latestEncounterRef) return null;

  // Get all observations from that encounter
  const latestSet = allObs.filter(
    (obs) => obs.encounter?.reference === latestEncounterRef
  );

  // Parse into display format
  let systolic: number | null = null;
  let diastolic: number | null = null;
  let temperature: number | null = null;
  let heartRate: number | null = null;
  let respiratoryRate: number | null = null;
  let weight: number | null = null;
  let height: number | null = null;
  let oxygenSaturation: number | null = null;
  let recordedAt: string | null = null;

  for (const obs of latestSet) {
    const code = obs.code.coding[0]?.code;
    if (!recordedAt) {
      recordedAt = obs.effectiveDateTime;
    }

    switch (code) {
      case VITAL_SIGN_CODES.bloodPressure.code:
        systolic = obs.component?.find(
          (c) => c.code.coding[0]?.code === VITAL_SIGN_CODES.systolic.code
        )?.valueQuantity.value ?? null;
        diastolic = obs.component?.find(
          (c) => c.code.coding[0]?.code === VITAL_SIGN_CODES.diastolic.code
        )?.valueQuantity.value ?? null;
        break;
      case VITAL_SIGN_CODES.temperature.code:
        temperature = obs.valueQuantity?.value ?? null;
        break;
      case VITAL_SIGN_CODES.heartRate.code:
        heartRate = obs.valueQuantity?.value ?? null;
        break;
      case VITAL_SIGN_CODES.respiratoryRate.code:
        respiratoryRate = obs.valueQuantity?.value ?? null;
        break;
      case VITAL_SIGN_CODES.weight.code:
        weight = obs.valueQuantity?.value ?? null;
        break;
      case VITAL_SIGN_CODES.height.code:
        height = obs.valueQuantity?.value ?? null;
        break;
      case VITAL_SIGN_CODES.oxygenSaturation.code:
        oxygenSaturation = obs.valueQuantity?.value ?? null;
        break;
    }
  }

  return {
    systolic,
    diastolic,
    temperature,
    heartRate,
    respiratoryRate,
    weight,
    height,
    oxygenSaturation,
    recordedAt,
  };
}

/**
 * Gets vital signs grouped by encounter for history display.
 */
export function getVitalSignsHistory(patientId: string) {
  const allObs = getVitalSignsForPatient(patientId);

  // Group by encounter
  const groups = new Map<string, FHIRObservation[]>();

  for (const obs of allObs) {
    const encounterRef = obs.encounter?.reference ?? 'unknown';
    if (!groups.has(encounterRef)) {
      groups.set(encounterRef, []);
    }
    groups.get(encounterRef)!.push(obs);
  }

  // Convert to array of records
  const records: Array<{
    encounterId: string;
    date: string;
    systolic: number | null;
    diastolic: number | null;
    temperature: number | null;
    heartRate: number | null;
    respiratoryRate: number | null;
    weight: number | null;
    height: number | null;
    oxygenSaturation: number | null;
  }> = [];

  for (const [encounterRef, observations] of groups) {
    const encounterId = encounterRef.replace('Encounter/', '');
    let systolic: number | null = null;
    let diastolic: number | null = null;
    let temperature: number | null = null;
    let heartRate: number | null = null;
    let respiratoryRate: number | null = null;
    let weight: number | null = null;
    let height: number | null = null;
    let oxygenSaturation: number | null = null;
    let date = observations[0]?.effectiveDateTime ?? '';

    for (const obs of observations) {
      const code = obs.code.coding[0]?.code;
      switch (code) {
        case VITAL_SIGN_CODES.bloodPressure.code:
          systolic = obs.component?.find(
            (c) => c.code.coding[0]?.code === VITAL_SIGN_CODES.systolic.code
          )?.valueQuantity.value ?? null;
          diastolic = obs.component?.find(
            (c) => c.code.coding[0]?.code === VITAL_SIGN_CODES.diastolic.code
          )?.valueQuantity.value ?? null;
          break;
        case VITAL_SIGN_CODES.temperature.code:
          temperature = obs.valueQuantity?.value ?? null;
          break;
        case VITAL_SIGN_CODES.heartRate.code:
          heartRate = obs.valueQuantity?.value ?? null;
          break;
        case VITAL_SIGN_CODES.respiratoryRate.code:
          respiratoryRate = obs.valueQuantity?.value ?? null;
          break;
        case VITAL_SIGN_CODES.weight.code:
          weight = obs.valueQuantity?.value ?? null;
          break;
        case VITAL_SIGN_CODES.height.code:
          height = obs.valueQuantity?.value ?? null;
          break;
        case VITAL_SIGN_CODES.oxygenSaturation.code:
          oxygenSaturation = obs.valueQuantity?.value ?? null;
          break;
      }
    }

    records.push({
      encounterId,
      date,
      systolic,
      diastolic,
      temperature,
      heartRate,
      respiratoryRate,
      weight,
      height,
      oxygenSaturation,
    });
  }

  return records;
}
