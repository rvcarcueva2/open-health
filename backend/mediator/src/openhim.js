const axios = require('axios');
const https = require('https');

const OPENHIM_CORE_URL = process.env.OPENHIM_CORE_URL || 'https://localhost:8081';
const OPENHIM_USERNAME = process.env.OPENHIM_USERNAME || 'root@openhim.org';
const OPENHIM_PASSWORD = process.env.OPENHIM_PASSWORD || 'openhim-password';

// OpenHIM uses self-signed certs by default
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const mediatorConfig = {
  urn: 'urn:mediator:frappe-fhir-mediator',
  version: '1.0.0',
  name: 'Frappe Health to FHIR R4 Mediator',
  description: 'Transforms Frappe Health DocTypes to HL7 FHIR R4 resources and routes them to HAPI FHIR',
  defaultChannelConfig: [
    {
      name: 'Frappe Patient Channel',
      urlPattern: '^/frappe/patient$',
      routes: [
        {
          name: 'Patient Mediator Route',
          host: 'frappe-fhir-mediator',
          port: 3000,
          path: '/mediate/patient',
          primary: true,
          type: 'http'
        }
      ],
      allow: ['frappe-client'],
      type: 'http'
    },
    {
      name: 'Frappe Encounter Channel',
      urlPattern: '^/frappe/encounter$',
      routes: [
        {
          name: 'Encounter Mediator Route',
          host: 'frappe-fhir-mediator',
          port: 3000,
          path: '/mediate/encounter',
          primary: true,
          type: 'http'
        }
      ],
      allow: ['frappe-client'],
      type: 'http'
    },
    {
      name: 'Frappe Observation Channel',
      urlPattern: '^/frappe/observation$',
      routes: [
        {
          name: 'Observation Mediator Route',
          host: 'frappe-fhir-mediator',
          port: 3000,
          path: '/mediate/observation',
          primary: true,
          type: 'http'
        }
      ],
      allow: ['frappe-client'],
      type: 'http'
    }
  ],
  endpoints: [
    {
      name: 'Mediator Heartbeat',
      host: 'frappe-fhir-mediator',
      path: '/health',
      port: 3000,
      primary: true,
      type: 'http'
    }
  ]
};

async function registerMediator() {
  const response = await axios.post(
    `${OPENHIM_CORE_URL}/mediators`,
    mediatorConfig,
    {
      auth: {
        username: OPENHIM_USERNAME,
        password: OPENHIM_PASSWORD
      },
      httpsAgent,
      headers: { 'Content-Type': 'application/json' }
    }
  );
  return response.data;
}

module.exports = { registerMediator, mediatorConfig };
