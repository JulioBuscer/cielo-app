import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb, calcDurationSec, formatDuration } from '@/src/db/client';
import { sleepSessions, sleepStatusEvents } from '@/src/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import type { SleepSession } from '@/src/db/schema';

// ─── QUERY: Sesión de sueño activa ───────────────────────────────────────────

export function useActiveSleepSession(babyId?: string) {
  return useQuery({
    queryKey: ['sleep_session', 'active', babyId],
    enabled:  !!babyId,
    staleTime: 0,
    queryFn: async () => {
      if (!babyId) return null;
      const res = await getDb()
        .select()
        .from(sleepSessions)
        .where(and(
          eq(sleepSessions.babyId, babyId),
          inArray(sleepSessions.status, ['active', 'paused'])
        ))
        .orderBy(desc(sleepSessions.startedAt))
        .limit(1);
      return res[0] ?? null;
    },
  });
}

// ─── QUERY: Sesión individual por ID ──────────────────────────────────────────

export function useSleepSession(sessionId?: string) {
  return useQuery({
    queryKey: ['sleep_session', 'detail', sessionId],
    enabled:  !!sessionId,
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await getDb()
        .select()
        .from(sleepSessions)
        .where(eq(sleepSessions.id, sessionId))
        .limit(1);
      return res[0] ?? null;
    },
  });
}

// ─── QUERY: Eventos de estado de sueño (timer preciso) ───────────────────────

export function useSleepStatusEvents(sessionId?: string) {
  return useQuery({
    queryKey: ['sleep_status_events', sessionId],
    enabled:  !!sessionId,
    staleTime: 0,
    queryFn: async () => {
      if (!sessionId) return [];
      return getDb()
        .select()
        .from(sleepStatusEvents)
        .where(eq(sleepStatusEvents.sessionId, sessionId))
        .orderBy(sleepStatusEvents.timestamp);
    },
  });
}

// ─── QUERY: Historial de sueño ───────────────────────────────────────────────

export function useSleepHistory(babyId?: string, limit = 20) {
  return useQuery({
    queryKey: ['sleep_session', 'history', babyId],
    enabled:  !!babyId,
    queryFn: async () => {
      if (!babyId) return [];
      return getDb()
        .select()
        .from(sleepSessions)
        .where(eq(sleepSessions.babyId, babyId))
        .orderBy(desc(sleepSessions.startedAt))
        .limit(limit);
    },
  });
}

// ─── MUTATION: Iniciar sueño ──────────────────────────────────────────────────

export function useStartSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { babyId: string }) => {
      const db = getDb();
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      const now = new Date();

      // Auto-terminar sesión activa/pausada si existe
      const existing = await db
        .select().from(sleepSessions)
        .where(and(
          eq(sleepSessions.babyId, input.babyId),
          inArray(sleepSessions.status, ['active', 'paused'])
        ))
        .limit(1);
      if (existing[0]) {
        await _finishSleepSession(existing[0].id, profileId, now);
      }

      const sessionId = generateId();
      await db.insert(sleepSessions).values({
        id: sessionId, babyId: input.babyId,
        profileId, status: 'active',
        startedAt: now, createdAt: now,
      });
      await db.insert(sleepStatusEvents).values({
        id: generateId(), sessionId, profileId,
        type: 'start', timestamp: now,
      });
      return sessionId;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sleep_session', 'active', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['sleep_session', 'history', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

// ─── MUTATION: Pausar sueño ───────────────────────────────────────────────────

export function usePauseSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: SleepSession) => {
      const db = getDb();
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      const now = new Date();
      await db.insert(sleepStatusEvents).values({
        id: generateId(), sessionId: session.id,
        profileId, type: 'pause', timestamp: now,
      });
      await db.update(sleepSessions)
        .set({ status: 'paused' })
        .where(eq(sleepSessions.id, session.id));
    },
    onSuccess: (_, session) => {
      qc.invalidateQueries({ queryKey: ['sleep_session', 'active', session.babyId] });
      qc.invalidateQueries({ queryKey: ['sleep_status_events', session.id] });
    },
  });
}

// ─── MUTATION: Continuar sueño ────────────────────────────────────────────────

export function useResumeSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: SleepSession) => {
      const db = getDb();
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      const now = new Date();
      await db.insert(sleepStatusEvents).values({
        id: generateId(), sessionId: session.id,
        profileId, type: 'resume', timestamp: now,
      });
      await db.update(sleepSessions)
        .set({ status: 'active' })
        .where(eq(sleepSessions.id, session.id));
    },
    onSuccess: (_, session) => {
      qc.invalidateQueries({ queryKey: ['sleep_session', 'active', session.babyId] });
      qc.invalidateQueries({ queryKey: ['sleep_status_events', session.id] });
    },
  });
}

// ─── MUTATION: Terminar sueño ─────────────────────────────────────────────────

export function useFinishSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: SleepSession) => {
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      await _finishSleepSession(session.id, profileId, new Date());
    },
    onSuccess: (_, session) => {
      qc.invalidateQueries({ queryKey: ['sleep_session', 'active', session.babyId] });
      qc.invalidateQueries({ queryKey: ['sleep_session', 'history', session.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

// ─── HELPER INTERNO ───────────────────────────────────────────────────────────

async function _finishSleepSession(sessionId: string, profileId: string, now: Date) {
  const db = getDb();
  await db.insert(sleepStatusEvents).values({
    id: generateId(), sessionId, profileId, type: 'finish', timestamp: now,
  });
  const events = await db.select().from(sleepStatusEvents)
    .where(eq(sleepStatusEvents.sessionId, sessionId))
    .orderBy(sleepStatusEvents.timestamp);
  const durationSec = calcDurationSec(events);
  await db.update(sleepSessions)
    .set({ status: 'finished', endedAt: now, durationSec })
    .where(eq(sleepSessions.id, sessionId));
}

// ─── HOOK: Timer preciso de sueño ────────────────────────────────────────────

export function useSleepPreciseElapsed(session: SleepSession): number {
  const { data: events } = useSleepStatusEvents(session.id);
  const [, setTick]      = useState(0);
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session.status === 'active') {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session.status]);

  if (!events || events.length === 0) return 0;

  let accumulated = 0;
  let lastActiveTs: number | null = null;
  for (const ev of events) {
    const ts = ev.timestamp instanceof Date ? ev.timestamp.getTime() : Number(ev.timestamp);
    if (ev.type === 'start' || ev.type === 'resume') { lastActiveTs = ts; }
    else if ((ev.type === 'pause' || ev.type === 'finish') && lastActiveTs !== null) {
      accumulated += (ts - lastActiveTs) / 1000;
      lastActiveTs = null;
    }
  }
  if (session.status === 'active' && lastActiveTs !== null) {
    accumulated += (Date.now() - lastActiveTs) / 1000;
  }
  return Math.floor(accumulated);
}

// ─── MUTATION: Actualizar sueño ───────────────────────────────────────────────

export function useUpdateSleepSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      babyId: string;
      startedAt?: Date;
      endedAt?: Date | null;
      notes?: string;
    }) => {
      const db = getDb();
      await db.update(sleepSessions)
        .set({
          startedAt: input.startedAt,
          endedAt:   input.endedAt,
          notes:     input.notes,
        })
        .where(eq(sleepSessions.id, input.id));

      if (input.startedAt && input.endedAt) {
        const durationSec = Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 1000);
        await db.update(sleepSessions)
          .set({ durationSec })
          .where(eq(sleepSessions.id, input.id));
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sleep_session', 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: ['sleep_session', 'history', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}
