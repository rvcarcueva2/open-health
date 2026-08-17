/**
 * OpenHIM Initial Configuration Script
 *
 * Run this AFTER docker-compose is up to:
 * 1. Change the default password
 * 2. Create a client for Frappe Health
 * 3. Create channels for the mediator
 *
 * Usage: node src/setup/configure-openhim.js
 */

const axios = require('axios');
const https = require('https');
const crypto = require('crypto');

// OpenHIM Core HTTPS API is on internal port 8080, mapped to host port 8081
const OPENHIM_API = 'https://localhost:8081';
const DEFAULT_EMAIL = 'root@openhim.org';
// Pass password as argument: node configure-openhim.js <your-password>
const DEFAULT_PASSWORD = process.argv[2] || 'openhim-password';
const NEW_PASSWORD = 'admin-password-change-me';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function authenticate(email, password) {
  // OpenHIM uses a custom auth mechanism
  const authResponse = await axios.get(`${OPENHIM_API}/authenticate/${email}`, { httpsAgent });
  const { salt, ts } = authResponse.data;

  const shasum = crypto.createHash('sha512');
  shasum.update(salt + password);
  const hashedPassword = shasum.digest('hex');

  const token = crypto.createHash('sha512');
  token.update(hashedPassword + salt + ts);
  const authToken = token.digest('hex');

  return {
    headers: {
      'auth-username': email,
      'auth-ts': ts,
      'auth-salt': salt,
      'auth-token': authToken,
      'Content-Type': 'application/json'
    },
    httpsAgent
  };
}

async function createClient(authConfig) {
  const passwordSalt = crypto.randomBytes(16).toString('hex');
  const shasum = crypto.createHash('sha512');
  shasum.update(passwordSalt + 'frappe-secret-key');
  const passwordHash = shasum.digest('hex');

  const client = {
    clientID: 'frappe-client',
    name: 'Frappe Health',
    roles: ['frappe-client'],
    passwordAlgorithm: 'sha512',
    passwordHash: passwordHash,
    passwordSalt: passwordSalt
  };

  // Try to delete existing client first
  try {
    const existing = await axios.get(`${OPENHIM_API}/clients`, authConfig);
    const found = existing.data.find(c => c.clientID === 'frappe-client');
    if (found) {
      await axios.delete(`${OPENHIM_API}/clients/${found._id}`, authConfig);
      console.log('[SETUP] Deleted existing client: frappe-client');
    }
  } catch (err) {
    // ignore
  }

  try {
    await axios.post(`${OPENHIM_API}/clients`, client, authConfig);
    console.log('[SETUP] Created client: frappe-client');
    console.log('[SETUP] Client credentials - ID: frappe-client / Password: frappe-secret-key');
  } catch (err) {
    if (err.response && err.response.status === 400) {
      console.log('[SETUP] Client already exists');
    } else {
      throw err;
    }
  }
}

async function createChannels(authConfig) {
  const channels = [
    {
      name: 'Frappe Patient to FHIR',
      urlPattern: '^/frappe/patient$',
      methods: ['POST', 'PUT', 'DELETE'],
      type: 'http',
      allow: ['frappe-client'],
      routes: [
        {
          name: 'Patient Mediator',
          host: 'frappe-fhir-mediator',
          port: 3000,
          path: '/mediate/patient',
          primary: true,
          type: 'http'
        }
      ]
    },
    {
      name: 'Frappe Encounter to FHIR',
      urlPattern: '^/frappe/encounter$',
      methods: ['POST', 'PUT', 'DELETE'],
      type: 'http',
      allow: ['frappe-client'],
      routes: [
        {
          name: 'Encounter Mediator',
          host: 'frappe-fhir-mediator',
          port: 3000,
          path: '/mediate/encounter',
          primary: true,
          type: 'http'
        }
      ]
    },
    {
      name: 'Frappe Observation to FHIR',
      urlPattern: '^/frappe/observation$',
      methods: ['POST', 'PUT', 'DELETE'],
      type: 'http',
      allow: ['frappe-client'],
      routes: [
        {
          name: 'Observation Mediator',
          host: 'frappe-fhir-mediator',
          port: 3000,
          path: '/mediate/observation',
          primary: true,
          type: 'http'
        }
      ]
    }
  ];

  for (const channel of channels) {
    try {
      await axios.post(`${OPENHIM_API}/channels`, channel, authConfig);
      console.log(`[SETUP] Created channel: ${channel.name}`);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`[SETUP] Channel already exists: ${channel.name}`);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log('[SETUP] Configuring OpenHIM...');
  console.log('[SETUP] Authenticating with OpenHIM Core...');

  try {
    const authConfig = await authenticate(DEFAULT_EMAIL, DEFAULT_PASSWORD);

    console.log('[SETUP] Creating Frappe Health client...');
    await createClient(authConfig);

    console.log('[SETUP] Creating mediator channels...');
    await createChannels(authConfig);

    console.log('\n[SETUP] Configuration complete!');
    console.log('\n--- Access Details ---');
    console.log(`OpenHIM Console: http://localhost:9000`);
    console.log(`Login: ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`);
    console.log(`\nFrappe Webhook Endpoints (via OpenHIM):`);
    console.log(`  POST http://<your-server-ip>:5001/frappe/patient`);
    console.log(`  POST http://<your-server-ip>:5001/frappe/encounter`);
    console.log(`  POST http://<your-server-ip>:5001/frappe/observation`);
    console.log(`\nDirect Mediator (for testing):`);
    console.log(`  POST http://localhost:3000/mediate/patient`);
    console.log(`  POST http://localhost:3000/mediate/encounter`);
    console.log(`  POST http://localhost:3000/mediate/observation`);
  } catch (err) {
    console.error('[SETUP] Failed:', err.message);
    if (err.response) {
      console.error('[SETUP] Response:', err.response.data);
    }
    process.exit(1);
  }
}

main();
