import { API_URL } from '../constants/api';

import {
    getPendingQueueItems,
    markQueueItemCompleted,
    markQueueItemFailed,
} from './syncQueue';

import {
    getResourceById,
    markResourceSynced,
} from '../db/resourceRepository';

export async function processQueue() {
  const queueItems = await getPendingQueueItems();

  console.log(
    `SYNC STARTED - ${queueItems.length} pending item(s)`
  );

  if (queueItems.length === 0) {
    console.log('SYNC FINISHED - nothing to sync');
    return;
  }

  // Group items by operation type
  const createItems = queueItems.filter((i) => i.operation === 'CREATE');
  const updateItems = queueItems.filter((i) => i.operation === 'UPDATE');
  const deleteItems = queueItems.filter((i) => i.operation === 'DELETE');

  // Process deletes individually
  for (const item of deleteItems) {
    try {
      const resource = await getResourceById(item.resourceId);
      if (!resource) {
        await markQueueItemFailed(item.id);
        continue;
      }
      const body = JSON.parse(resource.data);
      await syncDelete(body);
      await markResourceSynced(item.resourceId);
      await markQueueItemCompleted(item.id);
      console.log(`SYNC DELETE SUCCESS: ${item.resourceId}`);
    } catch (error) {
      console.error(`SYNC DELETE FAILED: ${item.id}`, error);
      await markQueueItemFailed(item.id);
    }
  }

  // Process creates — Patients go through OpenCR, others as transaction bundle
  if (createItems.length > 0) {
    await syncWithOpenCRRouting(createItems, 'PUT');
  }

  // Process updates — same routing logic
  if (updateItems.length > 0) {
    await syncWithOpenCRRouting(updateItems, 'PUT');
  }

  console.log('SYNC FINISHED');
}

/**
 * Syncs queue items with OpenCR routing:
 * - Patient resources are sent individually to /fhir/Patient so OpenHIM routes them to OpenCR
 * - All other resources are bundled in a transaction and sent to /fhir (routed to HAPI FHIR)
 * 
 * Flow:
 *   Patient → OpenHIM → OpenCR (deduplication + golden record) → stored in OpenCR HAPI FHIR
 *   Others  → OpenHIM → HAPI FHIR (direct pass-through)
 */
async function syncWithOpenCRRouting(
  items: Awaited<ReturnType<typeof getPendingQueueItems>>,
  method: 'PUT' | 'POST'
) {
  // Separate Patient items from non-Patient items
  const patientItems: typeof items = [];
  const otherItems: typeof items = [];

  for (const item of items) {
    const resource = await getResourceById(item.resourceId);
    if (!resource) {
      console.error(`RESOURCE NOT FOUND: ${item.resourceId}`);
      await markQueueItemFailed(item.id);
      continue;
    }

    const body = JSON.parse(resource.data);
    if (body.resourceType === 'Patient') {
      patientItems.push(item);
    } else {
      otherItems.push(item);
    }
  }

  // Step 1: Sync Patients individually through OpenCR
  // Must complete before other resources because Encounters/Observations reference Patient IDs
  for (const item of patientItems) {
    try {
      await syncPatientToOpenCR(item);
    } catch (error) {
      console.error(`SYNC PATIENT FAILED: ${item.resourceId}`, error);
      await markQueueItemFailed(item.id);
    }
  }

  // Step 2: Sync remaining resources as a transaction bundle to HAPI FHIR
  if (otherItems.length > 0) {
    await syncAsTransaction(otherItems, method);
  }
}

/**
 * Sends a single Patient resource to OpenHIM's /fhir/Patient endpoint.
 * OpenHIM channel matches POST/PUT /fhir/Patient and routes to OpenCR.
 * OpenCR performs deduplication, assigns/links a golden record.
 */
async function syncPatientToOpenCR(
  item: Awaited<ReturnType<typeof getPendingQueueItems>>[0]
) {
  const resource = await getResourceById(item.resourceId);
  if (!resource) {
    await markQueueItemFailed(item.id);
    return;
  }

  const body = JSON.parse(resource.data);

  // Ensure the Patient has the internalid required by OpenCR
  if (!hasInternalId(body)) {
    body.identifier = body.identifier || [];
    body.identifier.push({
      system: 'http://openclientregistry.org/fhir/internalid',
      value: body.id,
    });
  }

  const url = `${API_URL}/Patient`;

  console.log(`SYNCING PATIENT TO OPENCR: ${body.id}`);
  console.log(`  Name: ${formatPatientName(body)}`);
  console.log(`  URL: POST ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
        'x-openhim-clientid': 'chris-mobile',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    console.log(`  RESPONSE STATUS: ${response.status}`);
    console.log(`  RESPONSE BODY: ${responseText.substring(0, 300)}`);

    if (response.ok) {
      await markResourceSynced(item.resourceId);
      await markQueueItemCompleted(item.id);
      console.log(`  ✓ PATIENT SYNCED VIA OPENCR: ${item.resourceId}`);

      // Log golden record link if present in response
      try {
        const responseBody = JSON.parse(responseText);
        if (responseBody.link) {
          console.log(`  GOLDEN RECORD: ${responseBody.link[0]?.other?.reference}`);
        }
        if (responseBody.entry) {
          const goldenLinks = responseBody.entry
            .filter((e: any) => e.resource?.link)
            .flatMap((e: any) => e.resource.link)
            .map((l: any) => l.other?.reference);
          if (goldenLinks.length > 0) {
            console.log(`  GOLDEN RECORD: ${goldenLinks[0]}`);
          }
        }
      } catch {
        // Response parsing is optional — sync still succeeded
      }
    } else {
      console.error(`  ✗ PATIENT SYNC FAILED: ${response.status}`);
      await markQueueItemFailed(item.id);
    }
  } catch (error) {
    console.error(`  ✗ PATIENT SYNC ERROR:`, error);
    await markQueueItemFailed(item.id);
  }
}

/**
 * Check if a Patient resource already has the OpenCR internalid identifier
 */
function hasInternalId(patient: any): boolean {
  if (!patient.identifier || !Array.isArray(patient.identifier)) return false;
  return patient.identifier.some(
    (id: any) => id.system === 'http://openclientregistry.org/fhir/internalid'
  );
}

/**
 * Format patient name for logging
 */
function formatPatientName(patient: any): string {
  if (!patient.name || patient.name.length === 0) return '(no name)';
  const name = patient.name[0];
  const given = (name.given || []).join(' ');
  return `${given} ${name.family || ''}`.trim();
}

/**
 * Syncs non-Patient resources as a FHIR Transaction Bundle.
 * These go to /fhir (the bundle endpoint) which OpenHIM routes to HAPI FHIR directly.
 * Also includes any referenced resources (Patient, Encounter) not in the queue
 * for reference resolution.
 */
async function syncAsTransaction(
  items: Awaited<ReturnType<typeof getPendingQueueItems>>,
  method: 'PUT' | 'POST'
) {
  // Build bundle entries
  const entries: any[] = [];
  const validItems: typeof items = [];
  const includedIds = new Set<string>();

  for (const item of items) {
    const resource = await getResourceById(item.resourceId);
    if (!resource) {
      console.error(`RESOURCE NOT FOUND: ${item.resourceId}`);
      await markQueueItemFailed(item.id);
      continue;
    }

    const body = JSON.parse(resource.data);
    entries.push({
      fullUrl: `${body.resourceType}/${body.id}`,
      resource: body,
      request: {
        method: method,
        url: `${body.resourceType}/${body.id}`,
      },
    });
    includedIds.add(body.id);
    validItems.push(item);
  }

  if (entries.length === 0) return;

  // Find and include any referenced resources not already in the bundle
  for (const entry of [...entries]) {
    const res = entry.resource;

    // Check subject reference
    const subjectRef = res.subject?.reference;
    if (subjectRef) {
      const refId = subjectRef.split('/')[1];
      if (refId && !includedIds.has(refId)) {
        const refResource = await getResourceById(refId);
        if (refResource) {
          const refBody = JSON.parse(refResource.data);
          entries.push({
            fullUrl: `${refBody.resourceType}/${refBody.id}`,
            resource: refBody,
            request: {
              method: 'PUT',
              url: `${refBody.resourceType}/${refBody.id}`,
            },
          });
          includedIds.add(refId);
          console.log(`INCLUDING REFERENCED RESOURCE: ${refBody.resourceType}/${refBody.id}`);
        }
      }
    }

    // Check encounter reference
    const encounterRef = res.encounter?.reference;
    if (encounterRef) {
      const refId = encounterRef.split('/')[1];
      if (refId && !includedIds.has(refId)) {
        const refResource = await getResourceById(refId);
        if (refResource) {
          const refBody = JSON.parse(refResource.data);
          entries.push({
            fullUrl: `${refBody.resourceType}/${refBody.id}`,
            resource: refBody,
            request: {
              method: 'PUT',
              url: `${refBody.resourceType}/${refBody.id}`,
            },
          });
          includedIds.add(refId);
          console.log(`INCLUDING REFERENCED RESOURCE: ${refBody.resourceType}/${refBody.id}`);
        }
      }
    }
  }

  // Sort entries: Encounter first, then Observation, then others
  // (Patients are already synced individually via OpenCR)
  entries.sort((a, b) => {
    const order = (type: string) => {
      switch (type) {
        case 'Patient': return 1;
        case 'Encounter': return 2;
        case 'Observation': return 3;
        default: return 4;
      }
    };
    return order(a.resource.resourceType) - order(b.resource.resourceType);
  });

  const bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries,
  };

  console.log(`SYNCING TRANSACTION BUNDLE: ${entries.length} entries`);
  console.log(
    'Resource types:',
    entries.map((e) => `${e.resource.resourceType}/${e.resource.id}`).join(', ')
  );

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
        'x-openhim-clientid': 'chris-mobile',
      },
      body: JSON.stringify(bundle),
    });

    const responseText = await response.text();

    console.log(`TRANSACTION RESPONSE STATUS: ${response.status}`);
    console.log('TRANSACTION RESPONSE BODY:', responseText);

    if (response.ok) {
      // Mark all items as completed
      for (const item of validItems) {
        await markResourceSynced(item.resourceId);
        await markQueueItemCompleted(item.id);
      }
      console.log(`TRANSACTION SUCCESS: ${validItems.length} resources synced`);
    } else {
      // Transaction failed - mark all as failed
      console.error(`TRANSACTION FAILED: ${response.status}`);
      for (const item of validItems) {
        await markQueueItemFailed(item.id);
      }
    }
  } catch (error) {
    console.error('TRANSACTION ERROR:', error);
    for (const item of validItems) {
      await markQueueItemFailed(item.id);
    }
  }
}

async function syncDelete(resource: any) {
  const url = `${API_URL}/${resource.resourceType}/${resource.id}`;

  console.log(`DELETE ${url}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/fhir+json',
      'x-openhim-clientid': 'chris-mobile',
    },
  });

  const responseText = await response.text();

  console.log(`RESPONSE STATUS: ${response.status}`);
  console.log('RESPONSE BODY:', responseText);

  if (!response.ok) {
    throw new Error(
      `DELETE failed: ${response.status}\n${responseText}`
    );
  }
}
