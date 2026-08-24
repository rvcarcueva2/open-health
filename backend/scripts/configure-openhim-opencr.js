/**
 * Configure OpenHIM to route Patient requests through OpenCR
 * 
 * This script creates:
 * 1. A client (chris-mobile) that the mobile app authenticates as
 * 2. A channel that intercepts POST/PUT /Patient and routes to OpenCR
 * 3. A channel that routes all other FHIR requests directly to HAPI FHIR
 * 
 * Usage:
 *   node configure-openhim-opencr.js [openhim-password]
 */

const https = require('https');

const OPENHIM_API = 'https://localhost:8081';
const OPENHIM_USER = 'root@openhim.org';
const OPENHIM_PASS = process.argv[2] || 'apc-open-health';

// Ignore self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function apiRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, OPENHIM_API);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${OPENHIM_USER}:${OPENHIM_PASS}`).toString('base64')
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function authenticate() {
  // OpenHIM uses a custom auth flow. First try basic auth with the root password.
  const res = await apiRequest('GET', '/authenticate/root@openhim.org');
  if (res.status === 404) {
    // Older OpenHIM - try direct basic auth
    console.log('Using direct basic auth...');
    return;
  }
  console.log('Auth response:', res.status);
}

async function createClient() {
  const client = {
    clientID: 'chris-mobile',
    name: 'CHRIS Mobile App',
    roles: ['opencr-client', 'fhir-client'],
    passwordAlgorithm: 'sha512',
    passwordHash: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    passwordSalt: 'salt'
  };

  const res = await apiRequest('POST', '/clients', client);
  if (res.status === 201) {
    console.log('✓ Client "chris-mobile" created');
  } else if (res.status === 400 && JSON.stringify(res.data).includes('duplicate')) {
    console.log('• Client "chris-mobile" already exists');
  } else {
    console.log('  Client creation response:', res.status, JSON.stringify(res.data).substring(0, 200));
  }
}

async function createChannels() {
  // Channel 1: Route Patient create/update to OpenCR
  const opencrChannel = {
    name: 'Patient MPI (OpenCR)',
    description: 'Routes Patient create/update through OpenCR for deduplication before storing in HAPI FHIR',
    urlPattern: '^/fhir/Patient.*$',
    methods: ['POST', 'PUT'],
    type: 'http',
    status: 'enabled',
    authType: 'public',  // For testing; switch to 'private' in production
    routes: [
      {
        name: 'OpenCR',
        host: 'opencr',
        port: 3000,
        path: '/ocrux/fhir/Patient',
        primary: true,
        type: 'http',
        secured: false  // OpenCR serves HTTP when mediator.register=true
      }
    ],
    matchContentTypes: ['application/fhir+json', 'application/json'],
    priority: 1,
    rewriteUrlsConfig: []
  };

  // Channel 2: Route all other FHIR requests directly to HAPI FHIR
  const fhirChannel = {
    name: 'FHIR Pass-through (HAPI)',
    description: 'Routes all non-Patient FHIR requests directly to HAPI FHIR server',
    urlPattern: '^/fhir.*$',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    type: 'http',
    status: 'enabled',
    authType: 'public',  // For testing; switch to 'private' in production
    routes: [
      {
        name: 'HAPI FHIR',
        host: 'hapi-fhir',
        port: 8080,
        path: '',
        pathTransform: 's/\\/fhir/\\/fhir/',
        primary: true,
        type: 'http'
      }
    ],
    matchContentTypes: [],
    priority: 2,
    rewriteUrlsConfig: []
  };

  // Create OpenCR channel
  let res = await apiRequest('POST', '/channels', opencrChannel);
  if (res.status === 201) {
    console.log('✓ Channel "Patient MPI (OpenCR)" created');
  } else if (res.status === 400) {
    console.log('• Channel "Patient MPI (OpenCR)" may already exist:', JSON.stringify(res.data).substring(0, 100));
  } else {
    console.log('  OpenCR channel response:', res.status, JSON.stringify(res.data).substring(0, 200));
  }

  // Create FHIR pass-through channel
  res = await apiRequest('POST', '/channels', fhirChannel);
  if (res.status === 201) {
    console.log('✓ Channel "FHIR Pass-through (HAPI)" created');
  } else if (res.status === 400) {
    console.log('• Channel "FHIR Pass-through (HAPI)" may already exist:', JSON.stringify(res.data).substring(0, 100));
  } else {
    console.log('  FHIR channel response:', res.status, JSON.stringify(res.data).substring(0, 200));
  }
}

async function main() {
  console.log('=== OpenHIM + OpenCR Channel Configuration ===\n');

  try {
    await authenticate();
    await createClient();
    await createChannels();

    console.log('\n=== Done ===');
    console.log('\nChannels configured:');
    console.log('  POST/PUT /fhir/Patient → OpenCR (deduplication) → stored in OpenCR HAPI FHIR');
    console.log('  GET/POST/PUT/DELETE /fhir/* → HAPI FHIR (direct pass-through)');
    console.log('\nMobile app sync target: http://<server-ip>:5001/fhir/Patient');
    console.log('  (OpenHIM port 5001 receives HTTP transactions, routes internally)\n');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
