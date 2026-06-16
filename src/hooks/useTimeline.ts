import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { timelineEvents, eventTypes, diaperObservations } from '@/src/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { getProfileId } from '@/src/utils/storage';
import { onMutationError } from '@/src/utils/mutationError';
import { writeOutbox } from '@/src/sync/outbox';
import { signalPeers } from '@/src/sync/hooks';
import type { DiaperMetadata, MedicationMetadata, GrowthMetadata, TemperatureMetadata } from '@/src/db/schema';

export type { DiaperMetadata, MedicationMetadata, GrowthMetadata, TemperatureMetadata };

// ─── SHARED INSERT (unifica patrón de guardado) ────────────────────────────
export async function insertTimelineEvent(input: {
  babyId:           string;
  profileId:        string;
  eventTypeId:      string;
  eventItemId?:     string | null;
  timestamp:        Date;
  notes?:           string | null;
  values?:          Record<string, unknown>;
  metadata?:        Record<string, unknown> | null;
  feedingSessionId?: string | null;
  sleepSessionId?:   string | null;
}) {
  const id = generateId();
  await getDb().insert(timelineEvents).values({
    id,
    babyId:           input.babyId,
    profileId:        input.profileId,
    feedingSessionId: input.feedingSessionId ?? null,
    sleepSessionId:   input.sleepSessionId ?? null,
    eventTypeId:      input.eventTypeId,
    eventItemId:      input.eventItemId ?? null,
    timestamp:        input.timestamp,
    notes:            input.notes ?? null,
    metadata:         input.metadata ? JSON.stringify(input.metadata) : null,
    values:           input.values ? JSON.stringify(input.values) : '{}',
    createdAt:        new Date(),
  });
  await writeOutbox('timeline_events', id, 'insert', { id, ...input, eventItemId: input.eventItemId ?? null });
  await signalPeers();
}

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
        .where(and(
          eq(timelineEvents.babyId, babyId),
          isNull(timelineEvents.deletedAt),
        ))
        .orderBy(desc(timelineEvents.timestamp))
        .limit(limit);
    },
  });
}

export function useTimelineEvent(eventId?: string) {
  return useQuery({
    queryKey: ['timeline_event', 'detail', eventId],
    enabled:  !!eventId,
    queryFn: async () => {
      if (!eventId) return null;
      const res = await getDb()
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.id, eventId))
        .limit(1);
      return res[0] ?? null;
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
        .where(and(
          eq(timelineEvents.babyId, babyId),
          isNull(timelineEvents.deletedAt),
        ))
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
      eventItemId?: string | null;
      metadata?: Record<string, unknown>;
      values?: Record<string, unknown>;
      notes?: string;
      timestamp: Date;
      feedingSessionId?: string;
      sleepSessionId?: string;
    }) => {
      const profileId = await getProfileId();
      await insertTimelineEvent({
        babyId:           input.babyId,
        profileId,
        eventTypeId:      input.eventTypeId,
        eventItemId:      input.eventItemId ?? null,
        timestamp:        input.timestamp,
        notes:            input.notes ?? null,
        metadata:         input.metadata ?? null,
        values:           input.values,
        feedingSessionId: input.feedingSessionId ?? null,
        sleepSessionId:   input.sleepSessionId ?? null,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['timeline', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline', 'last', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['calendar', vars.babyId], refetchType: 'all' });
      if (vars.eventTypeId === 'weight' || vars.eventTypeId === 'height' || vars.eventTypeId === 'measurement') {
        qc.invalidateQueries({ queryKey: ['growth_last', vars.babyId] });
        qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId] });
      }
    },
    onError: onMutationError("[useSaveTimelineEvent]"),
  });
}

export function useUpdateTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      babyId: string;
      eventTypeId?: string;
      eventItemId?: string | null;
      timestamp?: Date;
      notes?: string | null;
      metadata?: Record<string, unknown> | null;
      values?: Record<string, unknown> | null;
    }) => {
      const update: Record<string, any> = {};
      if (input.timestamp !== undefined) update.timestamp = input.timestamp;
      if (input.notes !== undefined) update.notes = input.notes;
      if (input.metadata !== undefined) update.metadata = input.metadata ? JSON.stringify(input.metadata) : null;
      if (input.values !== undefined) update.values = input.values ? JSON.stringify(input.values) : undefined;
      if (input.eventTypeId !== undefined) update.eventTypeId = input.eventTypeId;
      if (input.eventItemId !== undefined) update.eventItemId = input.eventItemId ?? null;
      await getDb().update(timelineEvents)
        .set(update)
        .where(eq(timelineEvents.id, input.id));
      await writeOutbox('timeline_events', input.id, 'update', { ...input, ...update });
      await signalPeers();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['timeline_event', 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: ['timeline', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline', 'last', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['growth_last', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId] });
    },
    onError: onMutationError("[useUpdateTimelineEvent]"),
  });
}

export function useDeleteTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; babyId: string }) => {
      const profileId = await getProfileId();
      await getDb().update(timelineEvents).set({
        deletedAt: new Date(),
        deletedBy: profileId,
      }).where(eq(timelineEvents.id, input.id));
      await writeOutbox('timeline_events', input.id, 'delete', { id: input.id, deletedBy: profileId });
      await signalPeers();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['timeline', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline', 'last', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline_event', 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: ['growth_last', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['calendar', vars.babyId], refetchType: 'all' });
    },
    onError: onMutationError("[useDeleteTimelineEvent]"),
  });
}

export function useCreateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { emoji: string; label: string; category: string }) => {
      const id = generateId();
      await getDb().insert(eventTypes).values({
        id,
        emoji:     input.emoji,
        label:     input.label,
        category:  input.category as any,
        isSystem:  false,
        createdAt: new Date(),
      });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event_types'] }),
    onError: onMutationError("[useCreateEventType]"),
  });
}

export function useCreateDiaperObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      emoji: string;
      label: string;
      isAlert?: boolean;
      metrics?: string;           // JSON: ObservationMetric[]
    }) => {
      const id = generateId();
      await getDb().insert(diaperObservations).values({
        id,
        emoji:     input.emoji,
        label:     input.label,
        isSystem:  false,
        isAlert:   input.isAlert ?? false,
        metrics:   input.metrics ?? '[]',
        createdAt: new Date(),
      });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diaper_observations'] }),
    onError: onMutationError("[useCreateDiaperObservation]"),
  });
}

export function useUpdateDiaperObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      emoji?: string;
      label?: string;
      isAlert?: boolean;
      metrics?: string;
      active?: boolean;
    }) => {
      await getDb().update(diaperObservations)
        .set({
          emoji:    input.emoji,
          label:    input.label,
          isAlert:  input.isAlert,
          metrics:  input.metrics,
          active:   input.active,
        })
        .where(eq(diaperObservations.id, input.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diaper_observations'] }),
    onError: onMutationError("[useUpdateDiaperObservation]"),
  });
}

export function useDeleteEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await getDb().delete(eventTypes).where(eq(eventTypes.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event_types'] }),
    onError: onMutationError("[useDeleteEventType]"),
  });
}

export function useUpdateEventTypeMetrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; metrics: string }) => {
      await getDb()
        .update(eventTypes)
        .set({ metrics: input.metrics })
        .where(eq(eventTypes.id, input.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event_types'] }),
    onError: onMutationError("[useUpdateEventTypeMetrics]"),
  });
}

export function useDeleteDiaperObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await getDb()
        .delete(diaperObservations)
        .where(eq(diaperObservations.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diaper_observations'] }),
    onError: onMutationError("[useDeleteDiaperObservation]"),
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function parseMetadata<T>(json?: string | null): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}
