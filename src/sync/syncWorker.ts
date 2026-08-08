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

  for (const item of queueItems) {
    try {
      console.log(
        `PROCESSING QUEUE ITEM: ${item.id}`
      );

      const resource = await getResourceById(
        item.resourceId
      );

      if (!resource) {
        console.error(
          `RESOURCE NOT FOUND: ${item.resourceId}`
        );

        await markQueueItemFailed(item.id);
        continue;
      }

      const body = JSON.parse(resource.data);

      console.log(
        'SYNCING RESOURCE:'
      );

      console.log(
        JSON.stringify(body, null, 2)
      );

      switch (item.operation) {
        case 'CREATE':
          await syncCreate(body);
          break;

        case 'UPDATE':
          await syncUpdate(body);
          break;

        case 'DELETE':
          await syncDelete(body);
          break;

        default:
          throw new Error(
            `Unsupported operation: ${item.operation}`
          );
      }

      await markResourceSynced(
        item.resourceId
      );

      await markQueueItemCompleted(
        item.id
      );

      console.log(
        `SYNC SUCCESS: ${item.resourceId}`
      );
    } catch (error) {
      console.error(
        `SYNC FAILED: ${item.id}`
      );

      console.error(error);

      await markQueueItemFailed(
        item.id
      );
    }
  }

  console.log('SYNC FINISHED');
}

async function syncCreate(
  resource: any
) {
  const url =
    `${API_URL}/${resource.resourceType}`;

  console.log(
    `POST ${url}`
  );

  console.log(
    'REQUEST BODY:'
  );

  console.log(
    JSON.stringify(resource, null, 2)
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':
        'application/fhir+json',
      Accept:
        'application/fhir+json',
    },
    body: JSON.stringify(resource),
  });

  const responseText =
    await response.text();

  console.log(
    `RESPONSE STATUS: ${response.status}`
  );

  console.log(
    'RESPONSE BODY:'
  );

  console.log(responseText);

  if (!response.ok) {
    throw new Error(
      `CREATE failed: ${response.status}\n${responseText}`
    );
  }
}

async function syncUpdate(
  resource: any
) {
  const url =
    `${API_URL}/${resource.resourceType}/${resource.id}`;

  console.log(
    `PUT ${url}`
  );

  console.log(
    'REQUEST BODY:'
  );

  console.log(
    JSON.stringify(resource, null, 2)
  );

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type':
        'application/fhir+json',
      Accept:
        'application/fhir+json',
    },
    body: JSON.stringify(resource),
  });

  const responseText =
    await response.text();

  console.log(
    `RESPONSE STATUS: ${response.status}`
  );

  console.log(
    'RESPONSE BODY:'
  );

  console.log(responseText);

  if (!response.ok) {
    throw new Error(
      `UPDATE failed: ${response.status}\n${responseText}`
    );
  }
}

async function syncDelete(
  resource: any
) {
  const url =
    `${API_URL}/${resource.resourceType}/${resource.id}`;

  console.log(
    `DELETE ${url}`
  );

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept:
        'application/fhir+json',
    },
  });

  const responseText =
    await response.text();

  console.log(
    `RESPONSE STATUS: ${response.status}`
  );

  console.log(
    'RESPONSE BODY:'
  );

  console.log(responseText);

  if (!response.ok) {
    throw new Error(
      `DELETE failed: ${response.status}\n${responseText}`
    );
  }
}