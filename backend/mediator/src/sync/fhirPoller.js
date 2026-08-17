const axios = require('axios');

const FHIR_BASE_URL = process.env.FHIR_BASE_URL || 'http://hapi-fhir:8080/fhir';
const POLL_INTERVAL_MS = process.env.POLL_INTERVAL_MS || 30000; // 30 seconds
const MEDIATOR_PORT = process.env.MEDIATOR_PORT || 3000;

let lastPollTime = null;

/**
 * Poll HAPI FHIR for recently updated resources and push to Frappe via OpenHIM
 */
async function pollForChanges() {
  // On first run, get everything from the last 5 minutes
  const since = lastPollTime || new Date(Date.now() - 300000).toISOString();
  lastPollTime = new Date().toISOString();

  try {
    // Poll for updated Patients
    const patientResponse = await axios.get(`${FHIR_BASE_URL}/Patient`, {
      params: { _lastUpdated: `gt${since}`, _count: 50 },
      headers: { Accept: 'application/fhir+json' }
    });

    const patients = patientResponse.data.entry || [];
    let synced = 0;

    for (const entry of patients) {
      const patient = entry.resource;

      // Skip patients that originated from Frappe (avoid infinite loop)
      const fromFrappe = patient.identifier?.find(
        id => id.system === 'http://frappe.health/patient'
      );
      if (fromFrappe) continue;

      // Route through OpenHIM for audit trail
      try {
        const OPENHIM_HTTP_PORT = process.env.OPENHIM_HTTP_PORT || 'http://openhim-core:5001';
        await axios.post(`${OPENHIM_HTTP_PORT}/reverse/patient`, patient, {
          headers: { 'Content-Type': 'application/json' }
        });
        synced++;
        console.log(`[POLLER] Synced Patient/${patient.id} to Frappe (via OpenHIM)`);
      } catch (err) {
        console.error(`[POLLER] Failed to sync Patient/${patient.id}:`, err.response?.data?.error || err.message);
      }
    }

    if (synced > 0) {
      console.log(`[POLLER] Synced ${synced} patient(s) to Frappe`);
    }
  } catch (err) {
    console.error(`[POLLER] Poll error:`, err.message);
  }
}

/**
 * Start the polling loop
 */
function startPolling() {
  console.log(`[POLLER] Starting FHIR→Frappe polling (every ${POLL_INTERVAL_MS / 1000}s)`);
  setInterval(pollForChanges, POLL_INTERVAL_MS);
  // Run once immediately
  setTimeout(pollForChanges, 5000);
}

/**
 * Register a FHIR Subscription in HAPI FHIR
 * This makes HAPI FHIR POST to the mediator whenever a Patient changes
 */
async function registerSubscription() {
  const subscription = {
    resourceType: 'Subscription',
    status: 'requested',
    criteria: 'Patient?',
    channel: {
      type: 'rest-hook',
      endpoint: `http://frappe-fhir-mediator:${MEDIATOR_PORT}/reverse/notification`,
      payload: 'application/fhir+json',
      header: ['Content-Type: application/fhir+json']
    },
    reason: 'Sync new/updated Patients to Frappe Health'
  };

  try {
    const response = await axios.post(`${FHIR_BASE_URL}/Subscription`, subscription, {
      headers: { 'Content-Type': 'application/fhir+json' }
    });
    console.log(`[SUBSCRIPTION] Registered Patient subscription: ${response.data.id}`);
    return response.data;
  } catch (err) {
    console.warn(`[SUBSCRIPTION] Failed to register (will use polling fallback):`, err.message);
    return null;
  }
}

module.exports = { startPolling, registerSubscription, pollForChanges };
