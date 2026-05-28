import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { eventPresets } from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { getProfileId } from '@/src/utils/storage';
import { onMutationError } from '@/src/utils/mutationError';
import type { EventPreset } from '@/src/db/schema';
import { insertTimelineEvent } from './useTimeline';

export type { EventPreset };

// ─── QUERIES ──────────────────────────────────────────────────────────────────

export function useEventPresets() {
  return useQuery({
    queryKey: ['event_presets'],
    queryFn: () =>
      getDb()
        .select()
        .from(eventPresets)
        .orderBy(asc(eventPresets.sortOrder)),
  });
}

export function useQuickActionPresets() {
  return useQuery({
    queryKey: ['event_presets', 'quick'],
    queryFn: () =>
      getDb()
        .select()
        .from(eventPresets)
        .where(eq(eventPresets.isQuickAction, 1 as any))
        .orderBy(asc(eventPresets.sortOrder)),
  });
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

export function useCreateEventPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      eventTypeId: string;
      name: string;
      emoji?: string;
      defaultValues?: Record<string, number>;
      defaultUnitOverrides?: Record<string, string>;
      defaultNotes?: string;
      defaultTags?: string[];
      isQuickAction?: boolean;
    }) => {
      console.log("[useCreateEventPreset] ENTER", { eventTypeId: input.eventTypeId, name: input.name, isQuickAction: input.isQuickAction });
      const id = generateId();
      try {
        await getDb().insert(eventPresets).values({
          id,
          eventTypeId: input.eventTypeId,
          name: input.name,
          emoji: input.emoji ?? '📌',
          defaultValues: input.defaultValues ? JSON.stringify(input.defaultValues) : '{}',
          defaultUnitOverrides: input.defaultUnitOverrides ? JSON.stringify(input.defaultUnitOverrides) : '{}',
          defaultNotes: input.defaultNotes ?? null,
          defaultTags: input.defaultTags ? JSON.stringify(input.defaultTags) : '[]',
          sortOrder: 0,
          isQuickAction: input.isQuickAction ?? false,
          createdAt: new Date(),
        });
        console.log("[useCreateEventPreset] INSERT EXECUTED OK");
      } catch (e) {
        console.log("[useCreateEventPreset] INSERT ERROR", e);
        throw e;
      }
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_presets'] });
      qc.invalidateQueries({ queryKey: ['event_presets', 'quick'] });
    },
    onError: onMutationError("[useCreateEventPreset]"),
  });
}

export function useUpdateEventPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      emoji?: string;
      defaultValues?: Record<string, number>;
      defaultUnitOverrides?: Record<string, string>;
      defaultNotes?: string;
      defaultTags?: string[];
      isQuickAction?: boolean;
      sortOrder?: number;
    }) => {
      const update: Record<string, any> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.emoji !== undefined) update.emoji = input.emoji;
      if (input.defaultValues !== undefined) update.defaultValues = JSON.stringify(input.defaultValues);
      if (input.defaultUnitOverrides !== undefined) update.defaultUnitOverrides = JSON.stringify(input.defaultUnitOverrides);
      if (input.defaultNotes !== undefined) update.defaultNotes = input.defaultNotes;
      if (input.defaultTags !== undefined) update.defaultTags = JSON.stringify(input.defaultTags);
      if (input.isQuickAction !== undefined) update.isQuickAction = input.isQuickAction;
      if (input.sortOrder !== undefined) update.sortOrder = input.sortOrder;
      await getDb().update(eventPresets).set(update).where(eq(eventPresets.id, input.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_presets'] });
      qc.invalidateQueries({ queryKey: ['event_presets', 'quick'] });
    },
    onError: onMutationError("[useUpdateEventPreset]"),
  });
}

export function useDeleteEventPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await getDb().delete(eventPresets).where(eq(eventPresets.id, id)).run();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_presets'] });
      qc.invalidateQueries({ queryKey: ['event_presets', 'quick'] });
    },
    onError: onMutationError("[useDeleteEventPreset]"),
  });
}

export function useQuickSavePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId: string;
      preset: EventPreset;
      timestamp?: Date;
      notes?: string;
    }) => {
      const profileId = await getProfileId();
      let values: Record<string, number> = {};
      try { values = JSON.parse(input.preset.defaultValues ?? '{}'); } catch {}
      let tags: string[] = [];
      try { tags = JSON.parse(input.preset.defaultTags ?? '[]'); } catch {}
      await insertTimelineEvent({
        babyId:      input.babyId,
        profileId,
        eventTypeId: input.preset.eventTypeId,
        timestamp:   input.timestamp,
        notes:       input.notes ?? input.preset.defaultNotes ?? null,
        values:      values as Record<string, unknown>,
        metadata: {
          presetId:     input.preset.id,
          presetName:   input.preset.name,
          presetEmoji:  input.preset.emoji ?? null,
          ...(tags.length > 0 && { tags }),
        },
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['timeline', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['calendar', vars.babyId], refetchType: 'all' });
    },
    onError: onMutationError("[useQuickSavePreset]"),
  });
}
