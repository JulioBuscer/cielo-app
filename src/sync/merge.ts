import { getDb } from '@/src/db/client';
import { timelineEvents, catalogItems, tags } from '@/src/db/schema';
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

  const [allTimelineEvents, allCatalogItems, allTags] = await Promise.all([
    db.select().from(timelineEvents).orderBy(asc(timelineEvents.createdAt)),
    db.select().from(catalogItems).orderBy(asc(catalogItems.createdAt)),
    db.select().from(tags).orderBy(asc(tags.createdAt)),
  ]);

  return {
    deviceId: localDeviceId,
    timestamp: Date.now(),
    timelineEvents: allTimelineEvents,
    catalogItems: allCatalogItems,
    tags: allTags,
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

export async function mergeSyncPayload(payload: SyncPayload): Promise<MergeResult> {
  const db = getDb();
  let mergedCount = 0;
  let conflictCount = 0;

  await db.transaction(async (tx) => {
    for (const ev of payload.timelineEvents) {
      const existing = await tx
        .select({ createdAt: timelineEvents.createdAt })
        .from(timelineEvents)
        .where(eq(timelineEvents.id, ev.id))
        .limit(1);

      const localTs = existing.length > 0 ? getTimestamp(existing[0]) : 0;

      if (existing.length === 0) {
        await tx.insert(timelineEvents).values(ev as any);
        mergedCount++;
      } else if (isRemoteNewer(ev, localTs)) {
        await tx
          .insert(timelineEvents)
          .values(ev as any)
          .onConflictDoUpdate({ target: timelineEvents.id, set: ev as any });
        mergedCount++;
      } else {
        conflictCount++;
      }
    }

    for (const ci of payload.catalogItems) {
      const existing = await tx
        .select({ createdAt: catalogItems.createdAt })
        .from(catalogItems)
        .where(eq(catalogItems.id, ci.id))
        .limit(1);

      const localTs = existing.length > 0 ? getTimestamp(existing[0]) : 0;

      if (existing.length === 0) {
        await tx.insert(catalogItems).values(ci as any);
        mergedCount++;
      } else if (isRemoteNewer(ci, localTs)) {
        await tx
          .insert(catalogItems)
          .values(ci as any)
          .onConflictDoUpdate({ target: catalogItems.id, set: ci as any });
        mergedCount++;
      } else {
        conflictCount++;
      }
    }

    for (const t of payload.tags) {
      const existing = await tx
        .select({ createdAt: tags.createdAt })
        .from(tags)
        .where(eq(tags.id, t.id))
        .limit(1);

      const localTs = existing.length > 0 ? getTimestamp(existing[0]) : 0;

      if (existing.length === 0) {
        await tx.insert(tags).values(t as any);
        mergedCount++;
      } else if (isRemoteNewer(t, localTs)) {
        await tx
          .insert(tags)
          .values(t as any)
          .onConflictDoUpdate({ target: tags.id, set: t as any });
        mergedCount++;
      } else {
        conflictCount++;
      }
    }
  });

  return { mergedCount, conflictCount };
}
