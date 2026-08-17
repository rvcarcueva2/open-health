const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { createResource, updateResource, searchByIdentifier } = require('../fhirClient');

const FRAPPE_SYSTEM = 'http://frappe.health/encounter';
const FRAPPE_PATIENT_SYSTEM = 'http://frappe.health/patient';

/**
 * Transform Frappe Patient Encounter to FHIR R4 Encounter resource
 *
 * Expected Frappe Encounter payload:
 * {
 *   "name": "HLC-ENC-00001",
 *   "patient": "HLC-PAT-00001",
 *   "practitioner": "HLC-PRAC-00001",
 *   "encounter_date": "2024-01-15",
 *   "encounter_time": "10:30:00",
 *   "status": "Finished",
 *   "encounter_type": "Consultation",
 *   "chief_complaint": "Fever and headache"
 * }
 */
function transformEncounter(frappeEncounter) {
  const statusMap = {
    'scheduled': 'planned',
    'in progress': 'in-progress',
    'finished': 'finished',
    'cancelled': 'cancelled'
  };

  const fhirEncounter = {
    resourceType: 'Encounter',
    identifier: [
      {
        system: FRAPPE_SYSTEM,
        value: frappeEncounter.name
      }
    ],
    status: statusMap[(frappeEncounter.status || '').toLowerCase()] || 'unknown',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory'
    },
    type: [
      {
        text: frappeEncounter.encounter_type || 'Consultation'
      }
    ],
    subject: {
      identifier: {
        system: FRAPPE_PATIENT_SYSTEM,
        value: frappeEncounter.patient
      },
      display: frappeEncounter.patient_name || frappeEncounter.patient
    }
  };

  // Period
  if (frappeEncounter.encounter_date) {
    const startDateTime = frappeEncounter.encounter_time
      ? `${frappeEncounter.encounter_date}T${frappeEncounter.encounter_time}`
      : frappeEncounter.encounter_date;

    fhirEncounter.period = { start: startDateTime };
  }

  // Practitioner participant
  if (frappeEncounter.practitioner) {
    fhirEncounter.participant = [
      {
        type: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'ATND',
                display: 'attender'
              }
            ]
          }
        ],
        individual: {
          identifier: {
            system: 'http://frappe.health/practitioner',
            value: frappeEncounter.practitioner
          },
          display: frappeEncounter.practitioner_name || frappeEncounter.practitioner
        }
      }
    ];
  }

  // Reason (chief complaint)
  if (frappeEncounter.chief_complaint) {
    fhirEncounter.reasonCode = [
      {
        text: frappeEncounter.chief_complaint
      }
    ];
  }

  return fhirEncounter;
}

/**
 * POST /mediate/encounter
 */
router.post('/', async (req, res) => {
  const transactionId = uuidv4();
  console.log(`[ENCOUNTER MEDIATOR] Transaction ${transactionId} - Received Frappe Encounter`);

  try {
    const frappeEncounter = req.body;

    if (!frappeEncounter.name || !frappeEncounter.patient) {
      return res.status(400).json({
        status: 'Failed',
        error: 'Missing required fields: name, patient'
      });
    }

    const fhirEncounter = transformEncounter(frappeEncounter);
    console.log(`[ENCOUNTER MEDIATOR] Transformed:`, JSON.stringify(fhirEncounter, null, 2));

    // Check if encounter already exists
    const searchResult = await searchByIdentifier('Encounter', FRAPPE_SYSTEM, frappeEncounter.name);
    let result;

    if (searchResult.total > 0) {
      const existingId = searchResult.entry[0].resource.id;
      fhirEncounter.id = existingId;
      result = await updateResource('Encounter', existingId, fhirEncounter);
    } else {
      result = await createResource(fhirEncounter);
    }

    res.status(200).json({
      'x-mediator-urn': 'urn:mediator:frappe-fhir-mediator',
      status: 'Successful',
      response: { body: result },
      properties: { transactionId, fhirResourceId: result.id }
    });
  } catch (err) {
    console.error(`[ENCOUNTER MEDIATOR] Error:`, err.message);
    res.status(500).json({ status: 'Failed', error: err.message });
  }
});

module.exports = router;
