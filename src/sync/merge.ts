import { getDb } from '@/src/db/client';
import { timelineEvents, catalogItems, tags } from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { SyncPayload } from './types';

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

export async function mergeSyncPayload(payload: SyncPayload): Promise<number> {
  const db = getDb();
  let merged = 0;

  await db.transaction(async (tx) => {
    for (const ev of payload.timelineEvents) {
      const existing = await tx
        .select({ id: timelineEvents.id })
        .from(timelineEvents)
        .where(eq(timelineEvents.id, ev.id))
        .limit(1);

      const exists = existing.length > 0;
      if (!exists || new Date(ev.createdAt).getTime() > new Date(existing[0].id).getTime()) {
        await tx
          .insert(timelineEvents)
          .values(ev as any)
          .onConflictDoUpdate({ target: timelineEvents.id, set: ev as any });
        merged++;
      }
    }

    for (const ci of payload.catalogItems) {
      await tx
        .insert(catalogItems)
        .values(ci as any)
        .onConflictDoUpdate({ target: catalogItems.id, set: ci as any });
      merged++;
    }

    for (const t of payload.tags) {
      await tx
        .insert(tags)
        .values(t as any)
        .onConflictDoUpdate({ target: tags.id, set: t as any });
      merged++;
    }
  });

  return merged;
}
