import { db } from '../db/database';
import { randomUUID } from 'expo-crypto';

export type SyncOperation =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE';

export interface SyncQueueItem {
  id: string;
  resourceId: string;
  operation: SyncOperation;
  status: string;
}

export async function queueCreate(
  resourceId: string
) {
  db.runSync(
    `
      INSERT INTO sync_queue
      (id, resourceId, operation, status)
      VALUES (?, ?, ?, ?)
    `,
    [
      randomUUID(),
      resourceId,
      'CREATE',
      'PENDING',
    ]
  );
}

export async function queueUpdate(
  resourceId: string
) {
  db.runSync(
    `
      INSERT INTO sync_queue
      (id, resourceId, operation, status)
      VALUES (?, ?, ?, ?)
    `,
    [
      randomUUID(),
      resourceId,
      'UPDATE',
      'PENDING',
    ]
  );
}

export async function queueDelete(
  resourceId: string
) {
  db.runSync(
    `
      INSERT INTO sync_queue
      (id, resourceId, operation, status)
      VALUES (?, ?, ?, ?)
    `,
    [
      randomUUID(),
      resourceId,
      'DELETE',
      'PENDING',
    ]
  );
}

export async function getPendingQueueItems() {
  return db.getAllSync<SyncQueueItem>(
    `
      SELECT *
      FROM sync_queue
      WHERE status = 'PENDING'
      ORDER BY rowid ASC
    `
  );
}

export async function markQueueItemCompleted(
  id: string
) {
  db.runSync(
    `
      UPDATE sync_queue
      SET status = 'COMPLETED'
      WHERE id = ?
    `,
    [id]
  );
}

export async function markQueueItemFailed(
  id: string
) {
  db.runSync(
    `
      UPDATE sync_queue
      SET status = 'FAILED'
      WHERE id = ?
    `,
    [id]
  );
}