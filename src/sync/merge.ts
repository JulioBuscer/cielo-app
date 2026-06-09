import { getDb } from '@/src/db/client';
import { timelineEvents, catalogItems, tags, profiles, babies } from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { SyncPayload } from './types';

export interface MergeResult {
  mergedCount: number;
  conflictCount: number;
}

export async function gatherLocalPayload(
  lastSyncAts: Record<string, number>,
  localDeviceId: string,
): Promise<SyncPayload> {
  const db = getDb();

  const [allTimelineEvents, allCatalogItems, allTags, allProfiles, allBabies] = await Promise.all([
    db.select().from(timelineEvents).orderBy(asc(timelineEvents.createdAt)),
    db.select().from(catalogItems).orderBy(asc(catalogItems.createdAt)),
    db.select().from(tags).orderBy(asc(tags.createdAt)),
    db.select().from(profiles).orderBy(asc(profiles.createdAt)),
    db.select().from(babies).orderBy(asc(babies.createdAt)),
  ]);

  return {
    deviceId: localDeviceId,
    timestamp: Date.now(),
    timelineEvents: allTimelineEvents,
    catalogItems: allCatalogItems,
    tags: allTags,
    profiles: allProfiles,
    babies: allBabies,
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

/** Check if a remote record is newer than the local one, returns true if remote wins */
function isRemoteNewer(remote: any, localTimestamp: number): boolean {
  return getTimestamp(remote) > localTimestamp;
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
    } else if (isRemoteNewer(record, localTs)) {
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

export async function mergeSyncPayload(payload: SyncPayload): Promise<MergeResult> {
  const db = getDb();
  const counters = { mergedCount: 0, conflictCount: 0 };

  await db.transaction(async (tx) => {
    await upsertTable(tx, timelineEvents, payload.timelineEvents ?? [], counters);
    await upsertTable(tx, catalogItems, payload.catalogItems ?? [], counters);
    await upsertTable(tx, tags, payload.tags ?? [], counters);
    await upsertTable(tx, profiles, payload.profiles ?? [], counters);
    await upsertTable(tx, babies, payload.babies ?? [], counters);
  });

  return counters;
}
