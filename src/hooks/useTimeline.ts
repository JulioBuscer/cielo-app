import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '@/src/db/client';
import { timelineEvents, eventTypes, diaperObservations } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import type { DiaperMetadata, MedicationMetadata, GrowthMetadata, TemperatureMetadata } from '@/src/db/schema';

export type { DiaperMetadata, MedicationMetadata, GrowthMetadata, TemperatureMetadata };

// ─── QUERIES ──────────────────────────────────────────────────────────────────

export function useTimeline(babyId?: string, limit = 30) {
  return useQuery({
    queryKey: ['timeline', babyId],
    enabled:  !!babyId,
    queryFn: async () => {
      if (!babyId) return [];
      return getDb()
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.babyId, babyId))
        .orderBy(desc(timelineEvents.timestamp))
        .limit(limit);
    },
  });
}

export function useLastTimelineEventByType(babyId?: string, eventTypeId?: string) {
  return useQuery({
    queryKey: ['timeline', 'last', babyId, eventTypeId],
    enabled:  !!babyId && !!eventTypeId,
    queryFn: async () => {
      if (!babyId || !eventTypeId) return null;
      const res = await getDb()
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.babyId, babyId))
        .orderBy(desc(timelineEvents.timestamp))
        .limit(20);
      return res.find(e => e.eventTypeId === eventTypeId) ?? null;
    },
  });
}

export function useEventTypes() {
  return useQuery({
    queryKey: ['event_types'],
    queryFn: () => getDb().select().from(eventTypes).orderBy(eventTypes.label),
  });
}

export function useDiaperObservations() {
  return useQuery({
    queryKey: ['diaper_observations'],
    queryFn: () => getDb().select().from(diaperObservations).orderBy(diaperObservations.label),
  });
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

export function useSaveTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId: string;
      eventTypeId: string;
      metadata?: Record<string, unknown>;
      notes?: string;
      timestamp?: Date;
      feedingSessionId?: string;
      sleepSessionId?: string;
    }) => {
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      const now = input.timestamp ?? new Date();
      await getDb().insert(timelineEvents).values({
        id:               generateId(),
        babyId:           input.babyId,
        profileId,
        feedingSessionId: input.feedingSessionId ?? null,
        sleepSessionId:   input.sleepSessionId ?? null,
        eventTypeId:      input.eventTypeId,
        timestamp:        now,
        notes:            input.notes ?? null,
        metadata:         input.metadata ? JSON.stringify(input.metadata) : null,
        createdAt:        new Date(),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['timeline', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline', 'last', vars.babyId] });
    },
  });
}

export function useCreateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { emoji: string; label: string; category: string }) => {
      await getDb().insert(eventTypes).values({
        id:        generateId(),
        emoji:     input.emoji,
        label:     input.label,
        category:  input.category as any,
        isSystem:  false,
        createdAt: new Date(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event_types'] }),
  });
}

export function useCreateDiaperObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { emoji: string; label: string }) => {
      await getDb().insert(diaperObservations).values({
        id:        generateId(),
        emoji:     input.emoji,
        label:     input.label,
        isSystem:  false,
        createdAt: new Date(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diaper_observations'] }),
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function parseMetadata<T>(json?: string | null): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}
