import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { feedingSessions, feedingStatusEvents } from '@/src/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { calcDurationSec } from '@/src/db/client';
import type { FeedingSession } from '@/src/db/schema';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type FeedingType = 'breast_left' | 'breast_right' | 'bottle';
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
    enabled: !!babyId,
    refetchInterval: 5000, // Actualiza cada 5s para el timer en vivo
    queryFn: async () => {
      if (!babyId) return null;
      const res = await db
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

// ─── QUERY: Historial de sesiones ─────────────────────────────────────────────

export function useFeedingHistory(babyId?: string, limit = 20) {
  return useQuery({
    queryKey: ['feeding_session', 'history', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      if (!babyId) return [];
      return db
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
    enabled: !!babyId,
    queryFn: async () => {
      if (!babyId) return null;
      const res = await db
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

// ─── MUTATION: Iniciar nueva toma ─────────────────────────────────────────────
// Si hay una toma activa/pausada, la termina automáticamente primero

export function useStartFeeding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId: string;
      type: FeedingType;
      bottleSubtype?: BottleSubtype;
    }) => {
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      const now = new Date();

      // 1. Auto-terminar toma activa/pausada existente
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

      // 2. Crear nueva sesión
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

      // 3. Evento de inicio
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
    },
  });
}

// ─── MUTATION: Continuar toma ─────────────────────────────────────────────────

export function useResumeFeeding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: FeedingSession) => {
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

// ─── HELPER INTERNO: terminar sesión ─────────────────────────────────────────

async function _finishSession(sessionId: string, profileId: string, now: Date) {
  // Agregar evento finish
  await db.insert(feedingStatusEvents).values({
    id: generateId(), sessionId,
    profileId, type: 'finish', timestamp: now,
  });

  // Calcular duración total
  const events = await db
    .select()
    .from(feedingStatusEvents)
    .where(eq(feedingStatusEvents.sessionId, sessionId))
    .orderBy(feedingStatusEvents.timestamp);

  const durationSec = calcDurationSec(events);

  // Actualizar sesión
  await db.update(feedingSessions)
    .set({ status: 'finished', endedAt: now, durationSec })
    .where(eq(feedingSessions.id, sessionId));
}
