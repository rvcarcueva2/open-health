const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { createFrappeResource, updateFrappeResource, searchFrappeByFhirId } = require('../frappeClient');

/**
 * FHIR R4 Patient → Frappe Health Patient transformation
 * This is the REVERSE direction: HAPI FHIR → OpenHIM → Frappe Health
 *
 * Triggered by FHIR Subscription notifications when a Patient is created/updated in HAPI FHIR
 */

function transformFhirToFrappePatient(fhirPatient) {
  const name = fhirPatient.name?.[0] || {};
  const phone = fhirPatient.telecom?.find(t => t.system === 'phone');
  const email = fhirPatient.telecom?.find(t => t.system === 'email');
  const address = fhirPatient.address?.[0] || {};

  // Map FHIR gender to Frappe sex
  const genderMap = {
    'male': 'Male',
    'female': 'Female',
    'other': 'Other',
    'unknown': ''
  };

  const frappePatient = {
    first_name: name.given?.[0] || '',
    middle_name: name.given?.[1] || '',
    last_name: name.family || '',
    sex: genderMap[fhirPatient.gender] || '',
    dob: fhirPatient.birthDate || '',
    mobile: phone?.value || '',
    email: email?.value || '',
    status: fhirPatient.active ? 'Active' : 'Disabled',
    // Custom field to track FHIR resource ID
    custom_fhir_id: fhirPatient.id,
    custom_fhir_last_updated: fhirPatient.meta?.lastUpdated || ''
  };

  // Address
  if (address.line || address.city) {
    frappePatient.address_line1 = address.line?.[0] || '';
    frappePatient.city = address.city || '';
    frappePatient.state = address.state || '';
    // Map common country codes to full names (Frappe requires full country name)
    const countryMap = {
      'PH': 'Philippines',
      'PHL': 'Philippines',
      'US': 'United States',
      'USA': 'United States',
      'GB': 'United Kingdom',
      'UK': 'United Kingdom'
    };
    const rawCountry = address.country || 'Philippines';
    frappePatient.country = countryMap[rawCountry.toUpperCase()] || rawCountry;
    frappePatient.pincode = address.postalCode || '';
  }

  return frappePatient;
}

function transformFhirToFrappeEncounter(fhirEncounter) {
  const statusMap = {
    'planned': 'Scheduled',
    'in-progress': 'In Progress',
    'finished': 'Finished',
    'cancelled': 'Cancelled'
  };

  const practitioner = fhirEncounter.participant?.find(
    p => p.type?.[0]?.coding?.[0]?.code === 'ATND'
  );

  return {
    patient: fhirEncounter.subject?.display || '',
    practitioner: practitioner?.individual?.display || '',
    encounter_date: fhirEncounter.period?.start?.split('T')[0] || '',
    encounter_time: fhirEncounter.period?.start?.split('T')[1] || '',
    status: statusMap[fhirEncounter.status] || 'Unknown',
    encounter_type: fhirEncounter.type?.[0]?.text || 'Consultation',
    symptoms: fhirEncounter.reasonCode?.[0]?.text || '',
    custom_fhir_id: fhirEncounter.id,
    custom_fhir_last_updated: fhirEncounter.meta?.lastUpdated || ''
  };
}

/**
 * POST /reverse/patient
 * Receives a FHIR Patient (from HAPI FHIR subscription or polling)
 * and creates/updates it in Frappe Health
 */
router.post('/patient', async (req, res) => {
  const transactionId = uuidv4();
  console.log(`[FHIR→FRAPPE] Transaction ${transactionId} - Received FHIR Patient`);

  try {
    const fhirPatient = req.body;

    if (!fhirPatient.resourceType || fhirPatient.resourceType !== 'Patient') {
      return res.status(400).json({
        status: 'Failed',
        error: 'Invalid resource: expected resourceType Patient'
      });
    }

    // Skip if this came from Frappe (has our identifier system) to avoid loops
    const fromFrappe = fhirPatient.identifier?.find(
      id => id.system === 'http://frappe.health/patient'
    );
    if (fromFrappe) {
      console.log(`[FHIR→FRAPPE] Skipping - Patient originated from Frappe (${fromFrappe.value})`);
      return res.status(200).json({
        status: 'Skipped',
        reason: 'Patient originated from Frappe, no reverse sync needed'
      });
    }

    const frappePatient = transformFhirToFrappePatient(fhirPatient);
    console.log(`[FHIR→FRAPPE] Transformed:`, JSON.stringify(frappePatient, null, 2));

    // Check if patient already exists in Frappe by FHIR ID
    const existing = await searchFrappeByFhirId('Patient', fhirPatient.id);
    let result;

    if (existing) {
      result = await updateFrappeResource('Patient', existing.name, frappePatient);
      console.log(`[FHIR→FRAPPE] Updated Frappe Patient: ${existing.name}`);
    } else {
      result = await createFrappeResource('Patient', frappePatient);
      console.log(`[FHIR→FRAPPE] Created Frappe Patient: ${result.name}`);
    }

    res.status(200).json({
      'x-mediator-urn': 'urn:mediator:frappe-fhir-mediator',
      status: 'Successful',
      response: { body: result },
      properties: {
        transactionId,
        direction: 'FHIR→Frappe',
        fhirResourceId: fhirPatient.id,
        frappeDocName: result.name
      }
    });
  } catch (err) {
    console.error(`[FHIR→FRAPPE] Error:`, err.message);
    res.status(500).json({
      status: 'Failed',
      error: err.message,
      properties: { transactionId }
    });
  }
});

/**
 * POST /reverse/encounter
 * Receives a FHIR Encounter and creates/updates it in Frappe Health
 */
router.post('/encounter', async (req, res) => {
  const transactionId = uuidv4();
  console.log(`[FHIR→FRAPPE] Transaction ${transactionId} - Received FHIR Encounter`);

  try {
    const fhirEncounter = req.body;

    if (!fhirEncounter.resourceType || fhirEncounter.resourceType !== 'Encounter') {
      return res.status(400).json({ status: 'Failed', error: 'Invalid resource: expected Encounter' });
    }

    // Skip if originated from Frappe
    const fromFrappe = fhirEncounter.identifier?.find(
      id => id.system === 'http://frappe.health/encounter'
    );
    if (fromFrappe) {
      return res.status(200).json({ status: 'Skipped', reason: 'Originated from Frappe' });
    }

    const frappeEncounter = transformFhirToFrappeEncounter(fhirEncounter);
    console.log(`[FHIR→FRAPPE] Transformed Encounter:`, JSON.stringify(frappeEncounter, null, 2));

    const existing = await searchFrappeByFhirId('Patient Encounter', fhirEncounter.id);
    let result;

    if (existing) {
      result = await updateFrappeResource('Patient Encounter', existing.name, frappeEncounter);
    } else {
      result = await createFrappeResource('Patient Encounter', frappeEncounter);
    }

    res.status(200).json({
      'x-mediator-urn': 'urn:mediator:frappe-fhir-mediator',
      status: 'Successful',
      response: { body: result },
      properties: { transactionId, direction: 'FHIR→Frappe', fhirResourceId: fhirEncounter.id }
    });
  } catch (err) {
    console.error(`[FHIR→FRAPPE] Encounter Error:`, err.message);
    res.status(500).json({ status: 'Failed', error: err.message });
  }
});

/**
 * POST /reverse/notification
 * FHIR Subscription notification handler
 * HAPI FHIR sends the full resource when it changes
 */
router.post('/notification', async (req, res) => {
  const transactionId = uuidv4();
  console.log(`[FHIR→FRAPPE] Subscription notification received`);

  try {
    const resource = req.body;

    if (!resource.resourceType) {
      return res.status(400).json({ status: 'Failed', error: 'No resourceType in payload' });
    }

    // Route to appropriate handler based on resource type
    const handlers = {
      'Patient': '/reverse/patient',
      'Encounter': '/reverse/encounter'
    };

    const handler = handlers[resource.resourceType];
    if (!handler) {
      console.log(`[FHIR→FRAPPE] No handler for ${resource.resourceType}, skipping`);
      return res.status(200).json({ status: 'Skipped', reason: `No handler for ${resource.resourceType}` });
    }

    // Forward internally
    const axios = require('axios');
    const result = await axios.post(`http://localhost:${process.env.MEDIATOR_PORT || 3000}${handler}`, resource);

    res.status(200).json(result.data);
  } catch (err) {
    console.error(`[FHIR→FRAPPE] Notification Error:`, err.message);
    res.status(500).json({ status: 'Failed', error: err.message });
  }
});

module.exports = router;
