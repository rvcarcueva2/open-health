const axios = require('axios');

// Frappe Health API Configuration
const FRAPPE_URL = process.env.FRAPPE_URL || 'http://host.docker.internal:8083';
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY || '';
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET || '';

// Alternative: use username/password auth
const FRAPPE_USERNAME = process.env.FRAPPE_USERNAME || 'Administrator';
const FRAPPE_PASSWORD = process.env.FRAPPE_PASSWORD || 'admin';

let sessionCookie = null;

/**
 * Authenticate with Frappe using username/password
 */
async function authenticate() {
  if (sessionCookie) return sessionCookie;

  console.log(`[FRAPPE CLIENT] Authenticating with ${FRAPPE_URL}`);

  try {
    const response = await axios.post(`${FRAPPE_URL}/api/method/login`, {
      usr: FRAPPE_USERNAME,
      pwd: FRAPPE_PASSWORD
    }, {
      withCredentials: true
    });

    // Extract session cookie
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
    }

    console.log(`[FRAPPE CLIENT] Authenticated successfully`);
    return sessionCookie;
  } catch (err) {
    console.error(`[FRAPPE CLIENT] Auth failed:`, err.message);
    throw new Error(`Frappe authentication failed: ${err.message}`);
  }
}

/**
 * Get headers for Frappe API requests
 */
async function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };

  // Prefer API key auth if available
  if (FRAPPE_API_KEY && FRAPPE_API_SECRET) {
    headers['Authorization'] = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;
  } else {
    // Fall back to session auth
    const cookie = await authenticate();
    if (cookie) {
      headers['Cookie'] = cookie;
    }
  }

  return headers;
}

/**
 * Create a resource in Frappe
 * @param {string} doctype - Frappe DocType (e.g., 'Patient', 'Patient Encounter')
 * @param {object} data - Document fields
 */
async function createFrappeResource(doctype, data) {
  const headers = await getHeaders();
  const url = `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`;

  console.log(`[FRAPPE CLIENT] Creating ${doctype}`);

  try {
    const response = await axios.post(url, data, { headers });
    console.log(`[FRAPPE CLIENT] Created ${doctype}: ${response.data.data.name}`);
    return response.data.data;
  } catch (err) {
    const errorDetail = err.response?.data?._server_messages || err.response?.data?.message || err.message;
    console.error(`[FRAPPE CLIENT] Create failed:`, errorDetail);
    throw new Error(`Frappe create ${doctype} failed: ${JSON.stringify(errorDetail)}`);
  }
}

/**
 * Update a resource in Frappe
 * @param {string} doctype - Frappe DocType
 * @param {string} name - Document name/ID
 * @param {object} data - Fields to update
 */
async function updateFrappeResource(doctype, name, data) {
  const headers = await getHeaders();
  const url = `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;

  console.log(`[FRAPPE CLIENT] Updating ${doctype}/${name}`);

  try {
    const response = await axios.put(url, data, { headers });
    console.log(`[FRAPPE CLIENT] Updated ${doctype}/${name}`);
    return response.data.data;
  } catch (err) {
    const errorDetail = err.response?.data?._server_messages || err.message;
    console.error(`[FRAPPE CLIENT] Update failed:`, errorDetail);
    throw new Error(`Frappe update ${doctype}/${name} failed: ${JSON.stringify(errorDetail)}`);
  }
}

/**
 * Search for a Frappe resource by its FHIR ID (stored in custom_fhir_id field)
 * @param {string} doctype - Frappe DocType
 * @param {string} fhirId - FHIR resource ID
 * @returns {object|null} - The Frappe document or null
 */
async function searchFrappeByFhirId(doctype, fhirId) {
  const headers = await getHeaders();
  const url = `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`;

  try {
    const response = await axios.get(url, {
      headers,
      params: {
        filters: JSON.stringify([['custom_fhir_id', '=', fhirId]]),
        limit_page_length: 1
      }
    });

    const results = response.data.data;
    if (results && results.length > 0) {
      console.log(`[FRAPPE CLIENT] Found ${doctype} with FHIR ID ${fhirId}: ${results[0].name}`);
      return results[0];
    }

    return null;
  } catch (err) {
    // If custom field doesn't exist yet, return null
    console.warn(`[FRAPPE CLIENT] Search failed (custom_fhir_id may not exist):`, err.message);
    return null;
  }
}

module.exports = {
  createFrappeResource,
  updateFrappeResource,
  searchFrappeByFhirId
};
