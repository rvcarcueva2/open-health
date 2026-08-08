import { API_URL } from "../constants/api";

export async function testConnection() {
  const response = await fetch(
    `${API_URL}/metadata`,
    {
      headers: {
        Accept: 'application/fhir+json',
      },
    }
  );

  const data = await response.json();

  console.log('FHIR Server:', data);

  return data;
}

export async function createPatient() {
  const patient = {
    resourceType: 'Patient',
    active: true,
    name: [
      {
        family: 'Dela Cruz',
        given: ['Juan'],
      },
    ],
  };

  const response = await fetch(
    `${API_URL}/Patient`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/fhir+json',
      },
      body: JSON.stringify(patient),
    }
  );

  return response.json();
}