import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { catalogItems, eventTypes } from '@/src/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { onMutationError } from '@/src/utils/mutationError';
import type { CatalogItem } from '@/src/db/schema';
import type { EventMetric } from '@/src/units/types';

export type { CatalogItem };

// ─── QUERIES ──────────────────────────────────────────────────────────────────

export function useCatalogItems(category?: string) {
  return useQuery({
    queryKey: ['catalog_items', category],
    queryFn: async () => {
      if (category) {
        return getDb().select().from(catalogItems)
          .where(eq(catalogItems.category, category as any))
          .orderBy(asc(catalogItems.sortOrder));
      }
      return getDb().select().from(catalogItems).orderBy(asc(catalogItems.sortOrder));
    },
  });
}

export function useCatalogItem(id?: string) {
  return useQuery({
    queryKey: ['catalog_item', id],
    queryFn: () =>
      getDb().select().from(catalogItems).where(eq(catalogItems.id, id!)).then((r) => r[0] ?? null),
    enabled: !!id,
  });
}

export function useRootItems(category?: string) {
  return useQuery({
    queryKey: ['catalog_items', 'root', category],
    queryFn: async () => {
      if (category) {
        return getDb().select().from(catalogItems)
          .where(and(isNull(catalogItems.parentId), eq(catalogItems.category, category as any)))
          .orderBy(asc(catalogItems.sortOrder));
      }
      return getDb().select().from(catalogItems)
        .where(isNull(catalogItems.parentId))
        .orderBy(asc(catalogItems.sortOrder));
    },
  });
}

export function useChildren(parentId?: string) {
  return useQuery({
    queryKey: ['catalog_items', 'children', parentId],
    queryFn: () =>
      getDb()
        .select()
        .from(catalogItems)
        .where(eq(catalogItems.parentId, parentId!))
        .orderBy(asc(catalogItems.sortOrder)),
    enabled: !!parentId,
  });
}

export function useQuickActionItems() {
  return useQuery({
    queryKey: ['catalog_items', 'quick'],
    queryFn: () =>
      getDb()
        .select()
        .from(catalogItems)
        .where(eq(catalogItems.isQuickAction, 1 as any))
        .orderBy(asc(catalogItems.sortOrder)),
  });
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

export function useCreateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: string;
      parentId?: string | null;
      name: string;
      emoji?: string;
      metrics?: EventMetric[];
      defaultValues?: Record<string, number>;
      defaultUnitOverrides?: Record<string, string>;
      defaultNotes?: string;
      defaultTags?: string[];
      isQuickAction?: boolean;
    }) => {
      const id = generateId();
      await getDb().insert(catalogItems).values({
        id,
        category: input.category as any,
        parentId: input.parentId ?? null,
        name: input.name,
        emoji: input.emoji ?? '📌',
        metrics: input.metrics ? JSON.stringify(input.metrics) : '[]',
        defaultValues: input.defaultValues ? JSON.stringify(input.defaultValues) : '{}',
        defaultUnitOverrides: input.defaultUnitOverrides ? JSON.stringify(input.defaultUnitOverrides) : '{}',
        defaultNotes: input.defaultNotes ?? null,
        defaultTags: input.defaultTags ? JSON.stringify(input.defaultTags) : '[]',
        isSystem: false,
        isQuickAction: input.isQuickAction ?? false,
        sortOrder: 0,
        createdAt: new Date(),
      });
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog_items'] });
      qc.invalidateQueries({ queryKey: ['event_types'] });
    },
    onError: onMutationError("[useCreateCatalogItem]"),
  });
}

export function useUpdateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      emoji?: string;
      metrics?: EventMetric[];
      defaultValues?: Record<string, number>;
      defaultUnitOverrides?: Record<string, string>;
      defaultNotes?: string | null;
      defaultTags?: string[];
      isQuickAction?: boolean;
    }) => {
      const update: Record<string, any> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.emoji !== undefined) update.emoji = input.emoji;
      if (input.metrics !== undefined) update.metrics = JSON.stringify(input.metrics);
      if (input.defaultValues !== undefined) update.defaultValues = JSON.stringify(input.defaultValues);
      if (input.defaultUnitOverrides !== undefined) update.defaultUnitOverrides = JSON.stringify(input.defaultUnitOverrides);
      if (input.defaultNotes !== undefined) update.defaultNotes = input.defaultNotes;
      if (input.defaultTags !== undefined) update.defaultTags = JSON.stringify(input.defaultTags);
      if (input.isQuickAction !== undefined) update.isQuickAction = input.isQuickAction;
      await getDb().update(catalogItems).set(update).where(eq(catalogItems.id, input.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog_items'] });
      qc.invalidateQueries({ queryKey: ['event_types'] });
    },
    onError: onMutationError("[useUpdateCatalogItem]"),
  });
}

export function useDeleteCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string | string[]) => {
      const idList = Array.isArray(ids) ? ids : [ids];
      for (const id of idList) {
        await getDb().delete(catalogItems).where(eq(catalogItems.id, id));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog_items'] });
      qc.invalidateQueries({ queryKey: ['event_types'] });
    },
    onError: onMutationError("[useDeleteCatalogItem]"),
  });
}

export function useQuickSaveCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId: string;
      item: CatalogItem;
      timestamp?: Date;
      notes?: string;
    }) => {
      const { insertTimelineEvent } = await import('./useTimeline');
      const { getProfileId } = await import('@/src/utils/storage');
      const profileId = await getProfileId();
      let values: Record<string, number> = {};
      try { values = JSON.parse(input.item.defaultValues ?? '{}'); } catch {}
      let tags: string[] = [];
      try { tags = JSON.parse(input.item.defaultTags ?? '[]'); } catch {}
      const eventTypeId = input.item.parentId ?? input.item.id;
      await insertTimelineEvent({
        babyId: input.babyId,
        profileId,
        eventTypeId,
        eventItemId: input.item.id,
        timestamp: input.timestamp,
        notes: input.notes ?? input.item.defaultNotes ?? null,
        values: values as Record<string, unknown>,
        metadata: {
          presetName: input.item.name,
          presetEmoji: input.item.emoji ?? null,
          ...(tags.length > 0 && { tags }),
        },
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['timeline', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['calendar', vars.babyId], refetchType: 'all' });
    },
    onError: onMutationError("[useQuickSaveCatalogItem]"),
  });
}
