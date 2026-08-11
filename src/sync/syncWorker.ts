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

  // Process creates as a transaction bundle
  if (createItems.length > 0) {
    await syncAsTransaction(createItems, 'PUT');
  }

  // Process updates as a transaction bundle
  if (updateItems.length > 0) {
    await syncAsTransaction(updateItems, 'PUT');
  }

  console.log('SYNC FINISHED');
}

/**
 * Syncs a group of queue items as a FHIR Transaction Bundle.
 * This ensures all resources are created atomically and references resolve correctly.
 * Also includes any referenced resources (Patient, Encounter) that may not be in the queue
 * but are needed for reference resolution.
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
  // This handles the case where a Patient was previously synced via POST
  // but needs to be PUT with our local ID for references to resolve
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

  // Sort entries: Patient first, then Encounter, then Observation, then others
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
