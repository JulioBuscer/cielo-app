import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb, calcDurationSec } from '@/src/db/client';
import { feedingSessions, feedingStatusEvents } from '@/src/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import type { FeedingSession } from '@/src/db/schema';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type FeedingType   = 'breast_left' | 'breast_right' | 'bottle';
export type BottleSubtype = 'breast_milk' | 'formula' | 'mixed' | 'other';

export const FEEDING_LABELS: Record<FeedingType, { emoji: string; label: string }> = {
  breast_left:  { emoji: '🤱', label: 'Pecho Izq.' },
  breast_right: { emoji: '🤱', label: 'Pecho Der.' },
  bottle:       { emoji: '🍼', label: 'Biberón' },
};

export const BOTTLE_SUBTYPE_LABELS: Record<BottleSubtype, { emoji: string; label: string }> = {
  breast_milk: { emoji: '🤱', label: 'Leche materna' },
  formula:     { emoji: '🥛', label: 'Fórmula' },
  mixed:       { emoji: '🔀', label: 'Mixta' },
  other:       { emoji: '🍶', label: 'Otro' },
};

// ─── QUERY: Sesión activa del bebé ────────────────────────────────────────────

export function useActiveFeedingSession(babyId?: string) {
  return useQuery({
    queryKey: ['feeding_session', 'active', babyId],
    enabled:  !!babyId,
    staleTime: 0,
    queryFn: async () => {
      if (!babyId) return null;
      const res = await getDb()
        .select()
        .from(feedingSessions)
        .where(
          and(
            eq(feedingSessions.babyId, babyId),
            inArray(feedingSessions.status, ['active', 'paused'])
          )
        )
        .orderBy(desc(feedingSessions.startedAt))
        .limit(1);
      return res[0] ?? null;
    },
  });
}

// ─── QUERY: Eventos de estado de una sesión (para el timer preciso) ───────────

export function useFeedingStatusEvents(sessionId?: string) {
  return useQuery({
    queryKey: ['feeding_status_events', sessionId],
    enabled:  !!sessionId,
    staleTime: 0,
    queryFn: async () => {
      if (!sessionId) return [];
      return getDb()
        .select()
        .from(feedingStatusEvents)
        .where(eq(feedingStatusEvents.sessionId, sessionId))
        .orderBy(feedingStatusEvents.timestamp);
    },
  });
}

// ─── QUERY: Historial de sesiones ─────────────────────────────────────────────

export function useFeedingHistory(babyId?: string, limit = 20) {
  return useQuery({
    queryKey: ['feeding_session', 'history', babyId],
    enabled:  !!babyId,
    queryFn: async () => {
      if (!babyId) return [];
      return getDb()
        .select()
        .from(feedingSessions)
        .where(eq(feedingSessions.babyId, babyId))
        .orderBy(desc(feedingSessions.startedAt))
        .limit(limit);
    },
  });
}

// ─── QUERY: Última sesión terminada ───────────────────────────────────────────

export function useLastFeedingSession(babyId?: string) {
  return useQuery({
    queryKey: ['feeding_session', 'last', babyId],
    enabled:  !!babyId,
    queryFn: async () => {
      if (!babyId) return null;
      const res = await getDb()
        .select()
        .from(feedingSessions)
        .where(
          and(
            eq(feedingSessions.babyId, babyId),
            eq(feedingSessions.status, 'finished')
          )
        )
        .orderBy(desc(feedingSessions.startedAt))
        .limit(1);
      return res[0] ?? null;
    },
  });
}

// ─── QUERY: Sesión individual por ID ──────────────────────────────────────────

export function useFeedingSession(sessionId?: string) {
  return useQuery({
    queryKey: ['feeding_session', 'detail', sessionId],
    enabled:  !!sessionId,
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await getDb()
        .select()
        .from(feedingSessions)
        .where(eq(feedingSessions.id, sessionId))
        .limit(1);
      return res[0] ?? null;
    },
  });
}

// ─── MUTATION: Iniciar nueva toma ─────────────────────────────────────────────

export function useStartFeeding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId: string;
      type: FeedingType;
      bottleSubtype?: BottleSubtype;
    }) => {
      const db = getDb();
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      const now = new Date();

      // Auto-terminar toma activa/pausada existente
      const existing = await db
        .select()
        .from(feedingSessions)
        .where(
          and(
            eq(feedingSessions.babyId, input.babyId),
            inArray(feedingSessions.status, ['active', 'paused'])
          )
        )
        .limit(1);

      if (existing[0]) {
        await _finishSession(existing[0].id, profileId, now);
      }

      // Crear nueva sesión
      const sessionId = generateId();
      await db.insert(feedingSessions).values({
        id:            sessionId,
        babyId:        input.babyId,
        profileId,
        type:          input.type,
        bottleSubtype: input.bottleSubtype ?? null,
        status:        'active',
        startedAt:     now,
        createdAt:     now,
      });

      // Registrar evento start
      await db.insert(feedingStatusEvents).values({
        id:        generateId(),
        sessionId,
        profileId,
        type:      'start',
        timestamp: now,
      });

      return sessionId;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['feeding_session', 'active', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['feeding_session', 'history', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

// ─── MUTATION: Pausar toma ────────────────────────────────────────────────────

export function usePauseFeeding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: FeedingSession) => {
      const db = getDb();
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      const now = new Date();
      await db.insert(feedingStatusEvents).values({
        id: generateId(), sessionId: session.id,
        profileId, type: 'pause', timestamp: now,
      });
      await db.update(feedingSessions)
        .set({ status: 'paused' })
        .where(eq(feedingSessions.id, session.id));
    },
    onSuccess: (_, session) => {
      qc.invalidateQueries({ queryKey: ['feeding_session', 'active', session.babyId] });
      qc.invalidateQueries({ queryKey: ['feeding_status_events', session.id] });
    },
  });
}

// ─── MUTATION: Continuar toma ─────────────────────────────────────────────────

export function useResumeFeeding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: FeedingSession) => {
      const db = getDb();
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      const now = new Date();
      await db.insert(feedingStatusEvents).values({
        id: generateId(), sessionId: session.id,
        profileId, type: 'resume', timestamp: now,
      });
      await db.update(feedingSessions)
        .set({ status: 'active' })
        .where(eq(feedingSessions.id, session.id));
    },
    onSuccess: (_, session) => {
      qc.invalidateQueries({ queryKey: ['feeding_session', 'active', session.babyId] });
      qc.invalidateQueries({ queryKey: ['feeding_status_events', session.id] });
    },
  });
}

// ─── MUTATION: Terminar toma ──────────────────────────────────────────────────

export function useFinishFeeding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: FeedingSession) => {
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      await _finishSession(session.id, profileId, new Date());
    },
    onSuccess: (_, session) => {
      qc.invalidateQueries({ queryKey: ['feeding_session', 'active', session.babyId] });
      qc.invalidateQueries({ queryKey: ['feeding_session', 'history', session.babyId] });
      qc.invalidateQueries({ queryKey: ['feeding_session', 'last', session.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

// ─── HELPER: terminar sesión (interno) ───────────────────────────────────────

async function _finishSession(sessionId: string, profileId: string, now: Date) {
  const db = getDb();

  await db.insert(feedingStatusEvents).values({
    id: generateId(), sessionId,
    profileId, type: 'finish', timestamp: now,
  });

  const events = await db
    .select()
    .from(feedingStatusEvents)
    .where(eq(feedingStatusEvents.sessionId, sessionId))
    .orderBy(feedingStatusEvents.timestamp);

  const durationSec = calcDurationSec(events);

  await db.update(feedingSessions)
    .set({ status: 'finished', endedAt: now, durationSec })
    .where(eq(feedingSessions.id, sessionId));
}

// ─── MUTATION: Actualizar toma ────────────────────────────────────────────────

export function useUpdateFeedingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      babyId: string;
      type?: FeedingType;
      bottleSubtype?: BottleSubtype | null;
      startedAt?: Date;
      endedAt?: Date | null;
      notes?: string;
    }) => {
      const db = getDb();
      await db.update(feedingSessions)
        .set({
          type:          input.type,
          bottleSubtype: input.bottleSubtype,
          startedAt:     input.startedAt,
          endedAt:       input.endedAt,
          notes:         input.notes,
        })
        .where(eq(feedingSessions.id, input.id));

      if (input.startedAt && input.endedAt) {
        const durationSec = Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 1000);
        await db.update(feedingSessions)
          .set({ durationSec })
          .where(eq(feedingSessions.id, input.id));
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['feeding_session', 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: ['feeding_session', 'history', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}
