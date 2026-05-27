import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { eventPresets } from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { getProfileId } from '@/src/utils/storage';
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
        .where(eq(eventPresets.isQuickAction, true as any))
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
      isQuickAction?: boolean;
    }) => {
      const id = generateId();
      await getDb().insert(eventPresets).values({
        id,
        eventTypeId: input.eventTypeId,
        name: input.name,
        emoji: input.emoji ?? '📌',
        defaultValues: input.defaultValues ? JSON.stringify(input.defaultValues) : '{}',
        defaultUnitOverrides: input.defaultUnitOverrides ? JSON.stringify(input.defaultUnitOverrides) : '{}',
        defaultNotes: input.defaultNotes ?? null,
        sortOrder: 0,
        isQuickAction: input.isQuickAction ?? false,
        createdAt: new Date(),
      });
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_presets'] });
    },
    onError: (e) => console.error('[useCreateEventPreset]', e),
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
      isQuickAction?: boolean;
      sortOrder?: number;
    }) => {
      const update: Record<string, any> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.emoji !== undefined) update.emoji = input.emoji;
      if (input.defaultValues !== undefined) update.default_values = JSON.stringify(input.defaultValues);
      if (input.defaultUnitOverrides !== undefined) update.default_unit_overrides = JSON.stringify(input.defaultUnitOverrides);
      if (input.defaultNotes !== undefined) update.default_notes = input.defaultNotes;
      if (input.isQuickAction !== undefined) update.is_quick_action = input.isQuickAction;
      if (input.sortOrder !== undefined) update.sort_order = input.sortOrder;
      await getDb().update(eventPresets).set(update).where(eq(eventPresets.id, input.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_presets'] });
    },
    onError: (e) => console.error('[useUpdateEventPreset]', e),
  });
}

export function useDeleteEventPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await getDb().delete(eventPresets).where(eq(eventPresets.id, id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_presets'] });
    },
    onError: (e) => console.error('[useDeleteEventPreset]', e),
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
      await insertTimelineEvent({
        babyId:      input.babyId,
        profileId,
        eventTypeId: input.preset.eventTypeId,
        timestamp:   input.timestamp,
        notes:       input.notes ?? input.preset.defaultNotes ?? null,
        values:      values as Record<string, unknown>,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['timeline', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['calendar', vars.babyId], refetchType: 'all' });
    },
    onError: (e) => console.error('[useQuickSavePreset]', e),
  });
}
