import { db } from './database';

export interface StoredResource {
  id: string;
  resourceType: string;
  data: string;
  synced: number;
}

export async function saveResource(resource: any) {
  db.runSync(
    `
      INSERT OR REPLACE INTO resources
      (id, resourceType, data, synced)
      VALUES (?, ?, ?, ?)
    `,
    [
      resource.id,
      resource.resourceType,
      JSON.stringify(resource),
      0,
    ]
  );
}

export async function getResourceById(id: string) {
  const result = db.getFirstSync<StoredResource>(
    `
      SELECT *
      FROM resources
      WHERE id = ?
    `,
    [id]
  );

  return result ?? null;
}

export async function getUnsyncedResources() {
  const result = db.getAllSync<StoredResource>(
    `
      SELECT *
      FROM resources
      WHERE synced = 0
    `
  );

  return result;
}

export async function markResourceSynced(id: string) {
  db.runSync(
    `
      UPDATE resources
      SET synced = 1
      WHERE id = ?
    `,
    [id]
  );
}

export async function deleteResource(id: string) {
  db.runSync(
    `
      DELETE FROM resources
      WHERE id = ?
    `,
    [id]
  );
}

export async function getAllResources() {
  return db.getAllSync<StoredResource>(
    `
      SELECT *
      FROM resources
      ORDER BY rowid DESC
    `
  );
}