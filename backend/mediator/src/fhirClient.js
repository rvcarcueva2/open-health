const axios = require('axios');

const FHIR_BASE_URL = process.env.FHIR_BASE_URL || 'http://localhost:8080/fhir';

const fhirClient = axios.create({
  baseURL: FHIR_BASE_URL,
  headers: {
    'Content-Type': 'application/fhir+json',
    'Accept': 'application/fhir+json'
  }
});

/**
 * Create a FHIR resource
 */
async function createResource(resource) {
  const resourceType = resource.resourceType;
  console.log(`[FHIR CLIENT] Creating ${resourceType}`);

  const response = await fhirClient.post(`/${resourceType}`, resource);
  console.log(`[FHIR CLIENT] Created ${resourceType}/${response.data.id}`);
  return response.data;
}

/**
 * Update a FHIR resource
 */
async function updateResource(resourceType, id, resource) {
  console.log(`[FHIR CLIENT] Updating ${resourceType}/${id}`);

  const response = await fhirClient.put(`/${resourceType}/${id}`, resource);
  console.log(`[FHIR CLIENT] Updated ${resourceType}/${id}`);
  return response.data;
}

/**
 * Search for a FHIR resource by identifier
 */
async function searchByIdentifier(resourceType, system, value) {
  console.log(`[FHIR CLIENT] Searching ${resourceType} by identifier ${system}|${value}`);

  const response = await fhirClient.get(`/${resourceType}`, {
    params: { identifier: `${system}|${value}` }
  });
  return response.data;
}

/**
 * Delete a FHIR resource
 */
async function deleteResource(resourceType, id) {
  console.log(`[FHIR CLIENT] Deleting ${resourceType}/${id}`);

  const response = await fhirClient.delete(`/${resourceType}/${id}`);
  return response.data;
}

module.exports = {
  createResource,
  updateResource,
  searchByIdentifier,
  deleteResource
};
