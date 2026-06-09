import { getDb } from '@/src/db/client';
import { syncOutbox } from '@/src/db/schema';
import { generateId } from '@/src/utils/id';
import { lte, asc, gte } from 'drizzle-orm';
import { getOrCreateDeviceId } from './device';
import type { SyncOperation } from './types';

export async function writeOutbox(
  tableName: 'timeline_events' | 'catalog_items' | 'tags' | 'profiles' | 'babies',
  recordId: string,
  operation: 'insert' | 'update' | 'delete',
  data: any,
) {
  const deviceId = await getOrCreateDeviceId();
  await getDb().insert(syncOutbox).values({
    id: generateId(),
    tableName,
    recordId,
    operation,
    data: JSON.stringify(data),
    createdBy: deviceId,
    createdAt: new Date(),
  });
}

export async function readOutbox(fromTime: number): Promise<SyncOperation[]> {
  const entries = await getDb()
    .select()
    .from(syncOutbox)
    .where(fromTime > 0 ? gte(syncOutbox.createdAt, new Date(fromTime)) : undefined)
    .orderBy(asc(syncOutbox.createdAt));

  return entries.map((e) => ({
    tableName: e.tableName as SyncOperation['tableName'],
    recordId: e.recordId,
    operation: e.operation as SyncOperation['operation'],
    data: JSON.parse(e.data),
    createdAt: e.createdAt instanceof Date ? e.createdAt.getTime() : Number(e.createdAt),
  }));
}

export async function pruneOutbox(upToTimestamp: number) {
  await getDb()
    .delete(syncOutbox)
    .where(lte(syncOutbox.createdAt, new Date(upToTimestamp)));
}
