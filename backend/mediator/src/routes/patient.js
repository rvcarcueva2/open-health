const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { createResource, updateResource, searchByIdentifier } = require('../fhirClient');

const FRAPPE_SYSTEM = 'http://frappe.health/patient';

/**
 * Transform Frappe Patient DocType to FHIR R4 Patient resource
 *
 * Expected Frappe Patient payload:
 * {
 *   "name": "HLC-PAT-00001",         // Frappe document name (ID)
 *   "first_name": "Juan",
 *   "middle_name": "Santos",
 *   "last_name": "Dela Cruz",
 *   "sex": "Male",
 *   "dob": "1990-05-15",
 *   "blood_group": "O Positive",
 *   "email": "juan@example.com",
 *   "mobile": "+639171234567",
 *   "status": 1,                      // 1 = active, 0 = inactive
 *   "address": {
 *     "address_line1": "123 Rizal St",
 *     "city": "Manila",
 *     "state": "NCR",
 *     "country": "Philippines",
 *     "pincode": "1000"
 *   }
 * }
 */
function transformPatient(frappePatient) {
  const fhirPatient = {
    resourceType: 'Patient',
    identifier: [
      {
        system: FRAPPE_SYSTEM,
        value: frappePatient.name
      }
    ],
    active: frappePatient.status === 1 || frappePatient.status === '1',
    name: [
      {
        use: 'official',
        family: frappePatient.last_name || '',
        given: [
          frappePatient.first_name,
          frappePatient.middle_name
        ].filter(Boolean)
      }
    ]
  };

  // Gender mapping
  if (frappePatient.sex) {
    const genderMap = {
      'male': 'male',
      'female': 'female',
      'other': 'other'
    };
    fhirPatient.gender = genderMap[frappePatient.sex.toLowerCase()] || 'unknown';
  }

  // Birth date
  if (frappePatient.dob) {
    fhirPatient.birthDate = frappePatient.dob;
  }

  // Telecom (phone & email)
  fhirPatient.telecom = [];
  if (frappePatient.mobile) {
    fhirPatient.telecom.push({
      system: 'phone',
      value: frappePatient.mobile,
      use: 'mobile'
    });
  }
  if (frappePatient.email) {
    fhirPatient.telecom.push({
      system: 'email',
      value: frappePatient.email
    });
  }
  if (fhirPatient.telecom.length === 0) {
    delete fhirPatient.telecom;
  }

  // Address
  if (frappePatient.address) {
    fhirPatient.address = [
      {
        use: 'home',
        line: [frappePatient.address.address_line1].filter(Boolean),
        city: frappePatient.address.city || '',
        state: frappePatient.address.state || '',
        postalCode: frappePatient.address.pincode || '',
        country: frappePatient.address.country || 'Philippines'
      }
    ];
  }

  return fhirPatient;
}

/**
 * POST /mediate/patient
 * Create or update a Patient in HAPI FHIR from Frappe data
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  const transactionId = uuidv4();

  console.log(`[PATIENT MEDIATOR] Transaction ${transactionId} - Received Frappe Patient`);
  console.log(`[PATIENT MEDIATOR] Payload:`, JSON.stringify(req.body, null, 2));

  try {
    const frappePatient = req.body;

    // Validate required fields
    if (!frappePatient.name || !frappePatient.first_name) {
      return res.status(400).json({
        'x-mediator-urn': 'urn:mediator:frappe-fhir-mediator',
        status: 'Failed',
        error: 'Missing required fields: name, first_name'
      });
    }

    // Transform to FHIR
    const fhirPatient = transformPatient(frappePatient);
    console.log(`[PATIENT MEDIATOR] Transformed FHIR Patient:`, JSON.stringify(fhirPatient, null, 2));

    // Check if patient already exists in HAPI FHIR
    const searchResult = await searchByIdentifier('Patient', FRAPPE_SYSTEM, frappePatient.name);
    let result;

    if (searchResult.total > 0) {
      // Update existing patient
      const existingId = searchResult.entry[0].resource.id;
      fhirPatient.id = existingId;
      result = await updateResource('Patient', existingId, fhirPatient);
      console.log(`[PATIENT MEDIATOR] Updated existing Patient/${existingId}`);
    } else {
      // Create new patient
      result = await createResource(fhirPatient);
      console.log(`[PATIENT MEDIATOR] Created new Patient/${result.id}`);
    }

    const elapsed = Date.now() - startTime;

    res.status(200).json({
      'x-mediator-urn': 'urn:mediator:frappe-fhir-mediator',
      status: 'Successful',
      response: {
        status: searchResult.total > 0 ? 200 : 201,
        headers: { 'content-type': 'application/fhir+json' },
        body: result,
        timestamp: new Date().toISOString()
      },
      orchestrations: [
        {
          name: 'Frappe Patient to FHIR R4 Transformation',
          request: { path: '/mediate/patient', method: 'POST', body: JSON.stringify(frappePatient) },
          response: { status: 200, body: JSON.stringify(result) }
        }
      ],
      properties: {
        transactionId,
        frappeDocName: frappePatient.name,
        fhirResourceId: result.id,
        elapsedMs: elapsed
      }
    });
  } catch (err) {
    console.error(`[PATIENT MEDIATOR] Error:`, err.message);
    res.status(500).json({
      'x-mediator-urn': 'urn:mediator:frappe-fhir-mediator',
      status: 'Failed',
      error: err.message,
      properties: { transactionId }
    });
  }
});

/**
 * DELETE /mediate/patient
 * Delete a Patient from HAPI FHIR based on Frappe document name
 */
router.delete('/', async (req, res) => {
  const transactionId = uuidv4();

  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'Failed',
        error: 'Missing required field: name (Frappe document name)'
      });
    }

    const searchResult = await searchByIdentifier('Patient', FRAPPE_SYSTEM, name);

    if (searchResult.total === 0) {
      return res.status(404).json({
        status: 'Failed',
        error: `Patient with Frappe ID ${name} not found in HAPI FHIR`
      });
    }

    const fhirId = searchResult.entry[0].resource.id;
    const { deleteResource } = require('../fhirClient');
    await deleteResource('Patient', fhirId);

    res.status(200).json({
      'x-mediator-urn': 'urn:mediator:frappe-fhir-mediator',
      status: 'Successful',
      properties: { transactionId, deletedFhirId: fhirId }
    });
  } catch (err) {
    console.error(`[PATIENT MEDIATOR] Delete Error:`, err.message);
    res.status(500).json({ status: 'Failed', error: err.message });
  }
});

module.exports = router;
