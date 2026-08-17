const express = require('express');
const bodyParser = require('body-parser');
const { registerMediator } = require('./openhim');
const patientRoutes = require('./routes/patient');
const encounterRoutes = require('./routes/encounter');
const observationRoutes = require('./routes/observation');
const fhirToFrappeRoutes = require('./routes/fhir-to-frappe');
const { startPolling, registerSubscription } = require('./sync/fhirPoller');

const app = express();
const PORT = process.env.MEDIATOR_PORT || 3000;
const ENABLE_FHIR_TO_FRAPPE = process.env.ENABLE_FHIR_TO_FRAPPE !== 'false';

app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'running', uptime: process.uptime(), fhirToFrappe: ENABLE_FHIR_TO_FRAPPE });
});

// Direction: Frappe → FHIR (forward mediator routes)
app.use('/mediate/patient', patientRoutes);
app.use('/mediate/encounter', encounterRoutes);
app.use('/mediate/observation', observationRoutes);

// Direction: FHIR → Frappe (reverse mediator routes)
app.use('/reverse', fhirToFrappeRoutes);

// Start server and register with OpenHIM
app.listen(PORT, async () => {
  console.log(`[MEDIATOR] Frappe-FHIR Bidirectional Mediator running on port ${PORT}`);
  console.log(`[MEDIATOR] Frappe→FHIR: POST /mediate/patient, /mediate/encounter, /mediate/observation`);
  console.log(`[MEDIATOR] FHIR→Frappe: POST /reverse/patient, /reverse/encounter, /reverse/notification`);

  // Attempt OpenHIM registration (retry if core isn't ready yet)
  setTimeout(async () => {
    try {
      await registerMediator();
      console.log('[MEDIATOR] Registered with OpenHIM Core');
    } catch (err) {
      console.warn('[MEDIATOR] Could not register with OpenHIM Core:', err.message);
      console.warn('[MEDIATOR] Mediator will still function, register manually via Console');
    }
  }, 10000);

  // Start FHIR→Frappe sync if enabled
  if (ENABLE_FHIR_TO_FRAPPE) {
    setTimeout(async () => {
      // Try FHIR Subscription first
      const sub = await registerSubscription();
      // Always start polling as reliable fallback
      console.log('[MEDIATOR] Starting FHIR→Frappe polling sync');
      startPolling();
    }, 15000); // Wait for HAPI FHIR to be ready
  }
});
