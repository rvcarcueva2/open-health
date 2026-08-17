const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { createResource, updateResource, searchByIdentifier } = require('../fhirClient');

const FRAPPE_SYSTEM = 'http://frappe.health/observation';
const FRAPPE_PATIENT_SYSTEM = 'http://frappe.health/patient';

/**
 * Transform Frappe Vital Signs to FHIR R4 Observation resource
 *
 * Expected Frappe Vital Signs payload:
 * {
 *   "name": "HLC-VS-00001",
 *   "patient": "HLC-PAT-00001",
 *   "encounter": "HLC-ENC-00001",
 *   "signs_date": "2024-01-15",
 *   "signs_time": "10:30:00",
 *   "vital_type": "blood_pressure",
 *   "systolic": 120,
 *   "diastolic": 80,
 *   "temperature": 37.5,
 *   "heart_rate": 72,
 *   "respiratory_rate": 18,
 *   "weight": 70,
 *   "height": 170,
 *   "bmi": 24.2,
 *   "oxygen_saturation": 98
 * }
 */

// LOINC codes for common vital signs
const VITAL_LOINC = {
  blood_pressure: { code: '85354-9', display: 'Blood pressure panel' },
  temperature: { code: '8310-5', display: 'Body temperature' },
  heart_rate: { code: '8867-4', display: 'Heart rate' },
  respiratory_rate: { code: '9279-1', display: 'Respiratory rate' },
  weight: { code: '29463-7', display: 'Body weight' },
  height: { code: '8302-2', display: 'Body height' },
  bmi: { code: '39156-5', display: 'Body mass index' },
  oxygen_saturation: { code: '2708-6', display: 'Oxygen saturation' }
};

function transformObservation(frappeVitals) {
  const observations = [];
  const baseObservation = {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }
        ]
      }
    ],
    subject: {
      identifier: {
        system: FRAPPE_PATIENT_SYSTEM,
        value: frappeVitals.patient
      }
    }
  };

  // Effective date/time
  let effectiveDateTime;
  if (frappeVitals.signs_date) {
    effectiveDateTime = frappeVitals.signs_time
      ? `${frappeVitals.signs_date}T${frappeVitals.signs_time}`
      : frappeVitals.signs_date;
  }

  // Encounter reference
  const encounterRef = frappeVitals.encounter
    ? { identifier: { system: 'http://frappe.health/encounter', value: frappeVitals.encounter } }
    : undefined;

  // Blood Pressure (compound observation)
  if (frappeVitals.systolic || frappeVitals.diastolic) {
    const bp = {
      ...baseObservation,
      identifier: [{ system: FRAPPE_SYSTEM, value: `${frappeVitals.name}-bp` }],
      code: {
        coding: [{ system: 'http://loinc.org', ...VITAL_LOINC.blood_pressure }]
      },
      effectiveDateTime,
      encounter: encounterRef,
      component: []
    };

    if (frappeVitals.systolic) {
      bp.component.push({
        code: {
          coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }]
        },
        valueQuantity: { value: frappeVitals.systolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
      });
    }
    if (frappeVitals.diastolic) {
      bp.component.push({
        code: {
          coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }]
        },
        valueQuantity: { value: frappeVitals.diastolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
      });
    }
    observations.push(bp);
  }

  // Simple numeric vitals
  const simpleVitals = [
    { field: 'temperature', unit: '°C', ucumCode: 'Cel' },
    { field: 'heart_rate', unit: 'beats/min', ucumCode: '/min' },
    { field: 'respiratory_rate', unit: 'breaths/min', ucumCode: '/min' },
    { field: 'weight', unit: 'kg', ucumCode: 'kg' },
    { field: 'height', unit: 'cm', ucumCode: 'cm' },
    { field: 'bmi', unit: 'kg/m2', ucumCode: 'kg/m2' },
    { field: 'oxygen_saturation', unit: '%', ucumCode: '%' }
  ];

  for (const vital of simpleVitals) {
    if (frappeVitals[vital.field] != null) {
      const loinc = VITAL_LOINC[vital.field];
      observations.push({
        ...baseObservation,
        identifier: [{ system: FRAPPE_SYSTEM, value: `${frappeVitals.name}-${vital.field}` }],
        code: {
          coding: [{ system: 'http://loinc.org', code: loinc.code, display: loinc.display }]
        },
        effectiveDateTime,
        encounter: encounterRef,
        valueQuantity: {
          value: frappeVitals[vital.field],
          unit: vital.unit,
          system: 'http://unitsofmeasure.org',
          code: vital.ucumCode
        }
      });
    }
  }

  return observations;
}

/**
 * POST /mediate/observation
 * Transforms Frappe Vital Signs into multiple FHIR Observations
 */
router.post('/', async (req, res) => {
  const transactionId = uuidv4();
  console.log(`[OBSERVATION MEDIATOR] Transaction ${transactionId} - Received Frappe Vitals`);

  try {
    const frappeVitals = req.body;

    if (!frappeVitals.name || !frappeVitals.patient) {
      return res.status(400).json({
        status: 'Failed',
        error: 'Missing required fields: name, patient'
      });
    }

    const fhirObservations = transformObservation(frappeVitals);
    console.log(`[OBSERVATION MEDIATOR] Generated ${fhirObservations.length} observations`);

    const results = [];
    for (const obs of fhirObservations) {
      const identifierValue = obs.identifier[0].value;
      const searchResult = await searchByIdentifier('Observation', FRAPPE_SYSTEM, identifierValue);

      let result;
      if (searchResult.total > 0) {
        const existingId = searchResult.entry[0].resource.id;
        obs.id = existingId;
        result = await updateResource('Observation', existingId, obs);
      } else {
        result = await createResource(obs);
      }
      results.push(result);
    }

    res.status(200).json({
      'x-mediator-urn': 'urn:mediator:frappe-fhir-mediator',
      status: 'Successful',
      response: { body: results },
      properties: {
        transactionId,
        observationCount: results.length,
        fhirResourceIds: results.map(r => r.id)
      }
    });
  } catch (err) {
    console.error(`[OBSERVATION MEDIATOR] Error:`, err.message);
    res.status(500).json({ status: 'Failed', error: err.message });
  }
});

module.exports = router;
