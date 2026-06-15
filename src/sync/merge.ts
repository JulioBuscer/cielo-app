import { getDb } from '@/src/db/client';
import { timelineEvents, catalogItems, tags, profiles, babies } from '@/src/db/schema';
import { eq, asc, and, sql } from 'drizzle-orm';
import { readOutbox } from './outbox';
import type { SyncPayload, SyncOperation } from './types';

export interface MergeResult {
  mergedCount: number;
  conflictCount: number;
}

type LogFn = (msg: string) => void;

export async function gatherLocalPayload(
  lastSyncAts: Record<string, number>,
  localDeviceId: string,
  onLog?: LogFn,
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

    onLog?.(`[gather] full sync: events=${events.length} items=${items.length} tags=${allTags.length} profiles=${allProfiles.length} babies=${allBabies.length}`);
    console.log('[Sync] gatherLocalPayload (full) enviando:', {
      timelineEvents: events.length,
      catalogItems: items.length,
      tags: allTags.length,
      profiles: allProfiles.length,
      babies: allBabies.length,
    });

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
  const [operations, incrementalBabies, incrementalProfiles] = await Promise.all([
    readOutbox(earliestUnsynced),
    db.select().from(babies).where(sql`${babies.deletedAt} IS NULL`).orderBy(asc(babies.createdAt)),
    db.select().from(profiles).where(sql`${profiles.deletedAt} IS NULL`).orderBy(asc(profiles.createdAt)),
  ]);

  onLog?.(`[gather] incremental sync: ops=${operations.length} babies=${incrementalBabies.length} profiles=${incrementalProfiles.length}`);
  console.log('[Sync] gatherLocalPayload (incremental) enviando:', {
    operations: operations.length,
    babies: incrementalBabies.length,
    profiles: incrementalProfiles.length,
  });

  return {
    deviceId: localDeviceId,
    timestamp,
    operations,
    babies: incrementalBabies,
    profiles: incrementalProfiles,
  };
}

/** Known timestamp columns across all synced tables */
const TIMESTAMP_FIELDS = new Set(['createdAt', 'updatedAt', 'deletedAt', 'birthDate', 'timestamp']);

/**
 * Convert string/number timestamps back to Date objects before passing to drizzle,
 * because JSON serialization turns Date objects into strings or numbers.
 */
function coerceRecord(record: any): any {
  if (!record || typeof record !== 'object') return record;
  const out: any = Array.isArray(record) ? [...record] : { ...record };
  for (const key of Object.keys(out)) {
    if (TIMESTAMP_FIELDS.has(key) && out[key] != null) {
      if (typeof out[key] === 'string') {
        out[key] = new Date(out[key]);
      } else if (typeof out[key] === 'number') {
        out[key] = new Date(out[key]);
      }
    }
  }
  return out;
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
  db: any,
  table: any,
  tableName: string,
  records: T[],
  counters: { mergedCount: number; conflictCount: number },
  log?: LogFn,
) {
  for (const rawRecord of records) {
    const record = coerceRecord(rawRecord);
    const recPreview = JSON.stringify(record).slice(0,120);
    log?.(`[${tableName}] id=${record?.id} createdAt=${typeof record?.createdAt} data=${recPreview}`);
    console.log(`[Sync] upsertTable(${tableName}) procesando record:`, record?.id, typeof record?.createdAt, recPreview);
    try {
      const existing = await db
        .select({ createdAt: table.createdAt })
        .from(table)
        .where(eq(table.id, record.id))
        .limit(1);

      const localTs = existing.length > 0 ? getTimestamp(existing[0]) : 0;

      if (existing.length === 0) {
        if (table === babies) {
          const dup = await db
            .select()
            .from(babies)
            .where(
              and(
                sql`LOWER(${babies.name}) = ${String(record.name).toLowerCase()}`,
                eq(babies.birthDate, record.birthDate),
              ),
            )
            .limit(1);

          if (dup.length > 0) {
            await db
              .update(babies)
              .set({ ...record, id: dup[0].id, updatedAt: new Date(), updatedBy: 'sync' })
              .where(eq(babies.id, dup[0].id));
            counters.mergedCount++;
            continue;
          }
        }
        const recordKeys = Object.keys(record).map(k => `${k}=${typeof record[k]}:${JSON.stringify(record[k]).slice(0,40)}`).join(', ');
        log?.(`[${tableName}] INSERT keys: ${recordKeys}`);
        console.log(`[Sync] upsertTable(${tableName}) INSERT keys: ${recordKeys}`);
        const cleaned = Object.fromEntries(
          Object.entries(record).filter(([_, v]) => v !== undefined)
        );
        if (Object.keys(cleaned).length !== Object.keys(record).length) {
          log?.(`[${tableName}] stripped ${Object.keys(record).length - Object.keys(cleaned).length} undefined keys`);
        }
        await db.insert(table).values(cleaned as any);
        counters.mergedCount++;
      } else if (getTimestamp(record) > localTs) {
        const { id: _id, createdAt: _ca, ...updates } = record;
        await db
          .update(table)
          .set({ ...updates, updatedAt: new Date(), updatedBy: 'sync' })
          .where(eq(table.id, record.id));
        counters.mergedCount++;
      } else {
        counters.conflictCount++;
      }
    } catch (err: any) {
      log?.(`[${tableName}] ERROR record ${record?.id}: ${err?.message || err}`);
      console.error(`[Sync] upsertTable(${tableName}) record ${record?.id}:`, err?.stack || err);
      throw err;
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

  const incoming = coerceRecord({ ...op.data });
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
            sql`LOWER(${babiesTable.name}) = ${String(incoming.name ?? '').toLowerCase()}`,
            eq(babiesTable.birthDate, incoming.birthDate ?? 0),
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
    const rawVal = { ...incoming, createdBy: senderDeviceId, createdAt: new Date(op.createdAt) };
    const opKeys = Object.keys(rawVal).map(k => `${k}=${typeof (rawVal as any)[k]}`).join(', ');
    console.log(`[Sync] processOperation INSERT ${op.tableName}: ${opKeys}`);
    const cleaned = Object.fromEntries(
      Object.entries(rawVal).filter(([_, v]) => v !== undefined)
    );
    await tx.insert(table).values(cleaned as any);
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

export async function mergeSyncPayload(payload: SyncPayload, onLog?: LogFn): Promise<MergeResult> {
  const db = getDb();
  const counters = { mergedCount: 0, conflictCount: 0 };

  const ops = payload.operations;
  if (ops && ops.length > 0) {
    onLog?.(`[merge] ${ops.length} operaciones, babies=${payload.babies?.length ?? 0}, profiles=${payload.profiles?.length ?? 0}`);
    // Upsert babies and profiles FIRST so FK constraints are satisfied
    // before processing operations that reference them.
    if (payload.babies) await upsertTable(db, babies, 'babies', payload.babies, counters, onLog);
    if (payload.profiles) await upsertTable(db, profiles, 'profiles', payload.profiles, counters, onLog);
    // Process operations sequentially without a wrapping transaction
    // to avoid deadlocking with gatherLocalPayload on the other side
    for (const op of ops) {
      try {
        await processOperation(db, op, counters, payload.deviceId);
      } catch (err: any) {
        onLog?.(`[merge] ERROR operation: ${op.tableName}/${op.recordId}: ${err?.message || err}`);
        console.error(`[Sync] processOperation failed: table=${op.tableName}, recordId=${op.recordId}, op=${op.operation}:`, err?.stack || err);
        throw err;
      }
    }
  } else {
    // Full-table upsert (no wrapping transaction to avoid DB lock contention).
    // Order: tables without FK dependencies first, then dependents.
    // timeline_events references babies, profiles, eventTypes (seeded at startup).
    // tags references babies.
    const errors: string[] = [];
    const tables = [
      ['babies', babies, payload.babies ?? []] as const,
      ['profiles', profiles, payload.profiles ?? []] as const,
      ['catalog_items', catalogItems, payload.catalogItems ?? []] as const,
      ['tags', tags, payload.tags ?? []] as const,
      ['timeline_events', timelineEvents, payload.timelineEvents ?? []] as const,
    ];
    for (const [name, table, records] of tables) {
      try {
        const preview = `records=${records.length} isArray=${Array.isArray(records)}`;
        onLog?.(`[merge] upsertTable(${name}): ${preview}`);
        console.log(`[Sync] upsertTable(${name}): ${preview}`);
        await upsertTable(db, table, name, records, counters, onLog);
      } catch (e: any) {
        onLog?.(`[merge] ERROR ${name}: ${e?.message || e}`);
        console.error(`[Sync] ERROR en ${name}:`, e?.stack || e);
        errors.push(`${name}: ${e?.message || e}`);
      }
    }
    if (errors.length > 0) {
      const msg = `Merge falló: ${errors.join('; ')}`;
      onLog?.(`[merge] ${msg}`);
      throw new Error(msg);
    }
  }

  return counters;
}
