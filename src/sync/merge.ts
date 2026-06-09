import { getDb } from '@/src/db/client';
import { timelineEvents, catalogItems, tags, profiles, babies } from '@/src/db/schema';
import { eq, asc, and, sql } from 'drizzle-orm';
import { readOutbox } from './outbox';
import type { SyncPayload, SyncOperation } from './types';

export interface MergeResult {
  mergedCount: number;
  conflictCount: number;
}

export async function gatherLocalPayload(
  lastSyncAts: Record<string, number>,
  localDeviceId: string,
): Promise<SyncPayload> {
  const db = getDb();
  const timestamp = Date.now();

  // Full sync for peers with no history
  const oldestSync = Math.min(...Object.values(lastSyncAts), Infinity);
  if (oldestSync === Infinity || Object.keys(lastSyncAts).length === 0) {
    const [events, items, allTags, allProfiles, allBabies] = await Promise.all([
      db.select().from(timelineEvents).where(sql`${timelineEvents.deletedAt} IS NULL`).orderBy(asc(timelineEvents.createdAt)),
      db.select().from(catalogItems).where(sql`${catalogItems.deletedAt} IS NULL`).orderBy(asc(catalogItems.createdAt)),
      db.select().from(tags).where(sql`${tags.deletedAt} IS NULL`).orderBy(asc(tags.createdAt)),
      db.select().from(profiles).where(sql`${profiles.deletedAt} IS NULL`).orderBy(asc(profiles.createdAt)),
      db.select().from(babies).where(sql`${babies.deletedAt} IS NULL`).orderBy(asc(babies.createdAt)),
    ]);

    return {
      deviceId: localDeviceId,
      timestamp,
      timelineEvents: events,
      catalogItems: items,
      tags: allTags,
      profiles: allProfiles,
      babies: allBabies,
    };
  }

  // Incremental sync — send operations since earliest unsynced timestamp
  const earliestUnsynced = Math.min(...Object.values(lastSyncAts));
  const operations = await readOutbox(earliestUnsynced);

  return {
    deviceId: localDeviceId,
    timestamp,
    operations,
  };
}

function getTimestamp(record: any): number {
  if (!record) return 0;
  const ts = record.createdAt;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (ts instanceof Date) return ts.getTime();
  return Number(ts) || 0;
}

function getUpdatedAt(record: any): number {
  if (!record) return 0;
  const ts = record.updatedAt;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (ts instanceof Date) return ts.getTime();
  return Number(ts) || 0;
}

async function upsertTable<T extends { id: string; createdAt: any }>(
  tx: any,
  table: any,
  records: T[],
  counters: { mergedCount: number; conflictCount: number },
) {
  for (const record of records) {
    const existing = await tx
      .select({ createdAt: table.createdAt })
      .from(table)
      .where(eq(table.id, record.id))
      .limit(1);

    const localTs = existing.length > 0 ? getTimestamp(existing[0]) : 0;

    if (existing.length === 0) {
      await tx.insert(table).values(record as any);
      counters.mergedCount++;
    } else if (getTimestamp(record) > localTs) {
      await tx
        .insert(table)
        .values(record as any)
        .onConflictDoUpdate({ target: table.id, set: record as any });
      counters.mergedCount++;
    } else {
      counters.conflictCount++;
    }
  }
}

function getTableByName(name: string) {
  switch (name) {
    case 'timeline_events': return timelineEvents;
    case 'catalog_items': return catalogItems;
    case 'tags': return tags;
    case 'profiles': return profiles;
    case 'babies': return babies;
    default: return null;
  }
}

async function processOperation(
  tx: any,
  op: SyncOperation,
  counters: { mergedCount: number; conflictCount: number },
  senderDeviceId: string,
) {
  const table = getTableByName(op.tableName);
  if (!table) return;

  if (op.operation === 'delete') {
    const existing = await tx
      .select({ id: table.id, updatedAt: table.updatedAt })
      .from(table)
      .where(eq(table.id, op.recordId))
      .limit(1);

    if (existing.length > 0) {
      await tx
        .update(table)
        .set({
          deletedAt: new Date(op.createdAt),
          deletedBy: senderDeviceId,
          updatedAt: new Date(op.createdAt),
          updatedBy: senderDeviceId,
        })
        .where(eq(table.id, op.recordId));
      counters.mergedCount++;
    }
    return;
  }

  const incoming = { ...op.data };
  const existing = await tx
    .select({ id: table.id, updatedAt: table.updatedAt, createdAt: table.createdAt })
    .from(table)
    .where(eq(table.id, op.recordId))
    .limit(1);

  if (existing.length === 0) {
    // Baby dedup: match by name (case-insensitive) + birthDate
    if (op.tableName === 'babies') {
      const babiesTable = babies;
      const dup = await tx
        .select()
        .from(babiesTable)
        .where(
          and(
            sql`LOWER(${babiesTable.name}) = ${incoming.name.toLowerCase()}`,
            eq(babiesTable.birthDate, incoming.birthDate),
          ),
        )
        .limit(1);

      if (dup.length > 0) {
        await tx
          .update(babiesTable)
          .set({ ...incoming, id: dup[0].id, updatedAt: new Date(op.createdAt), updatedBy: senderDeviceId })
          .where(eq(babiesTable.id, dup[0].id));
        counters.mergedCount++;
        return;
      }
    }

    // New record
    await tx.insert(table).values({
      ...incoming,
      createdBy: senderDeviceId,
      createdAt: new Date(op.createdAt),
    } as any);
    counters.mergedCount++;
  } else {
    const localUpdatedAt = getUpdatedAt(existing[0]);
    if (op.createdAt > localUpdatedAt) {
      await tx
        .update(table)
        .set({ ...incoming, updatedAt: new Date(op.createdAt), updatedBy: senderDeviceId })
        .where(eq(table.id, op.recordId));
      counters.mergedCount++;
    } else {
      counters.conflictCount++;
    }
  }
}

export async function mergeSyncPayload(payload: SyncPayload): Promise<MergeResult> {
  const db = getDb();
  const counters = { mergedCount: 0, conflictCount: 0 };

  const ops = payload.operations;
  if (ops && ops.length > 0) {
    await db.transaction(async (tx) => {
      for (const op of ops) {
        await processOperation(tx, op, counters, payload.deviceId);
      }
    });
  } else {
    // Legacy format: full-table upsert
    await db.transaction(async (tx) => {
      await upsertTable(tx, timelineEvents, payload.timelineEvents ?? [], counters);
      await upsertTable(tx, catalogItems, payload.catalogItems ?? [], counters);
      await upsertTable(tx, tags, payload.tags ?? [], counters);
      await upsertTable(tx, profiles, payload.profiles ?? [], counters);
      await upsertTable(tx, babies, payload.babies ?? [], counters);
    });
  }

  return counters;
}
