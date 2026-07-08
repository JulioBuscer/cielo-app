import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { getDb, calcDurationSec } from '@/src/db/client';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { resolveProfileId } from '@/src/utils/storage';
import { onMutationError } from '@/src/utils/mutationError';

type Row = { id: string; babyId: string; profileId: string; status: string; startedAt: Date; endedAt: Date | null; durationSec: number | null; notes: string | null; createdAt: Date };
type StatusRow = { id: string; sessionId: string; profileId: string; type: string; timestamp: Date };

export function createSessionHooks<TRow extends Row, TStatusRow extends StatusRow>(config: {
  table: any;
  statusEventsTable: any;
  queryKey: string;
  tag: string;
  startExtra?: (input: any) => Record<string, any>;
  updateExtra?: (input: any) => Record<string, any>;
  extraInvalidations?: {
    start?: (vars: any) => (string | number)[][];
    finish?: (session: any) => (string | number)[][];
  };
}) {
  const { table, statusEventsTable, queryKey, tag, startExtra, updateExtra, extraInvalidations } = config;

  function useActiveSession(babyId?: string) {
    return useQuery({
      queryKey: [queryKey, 'active', babyId],
      enabled: !!babyId,
      staleTime: 0,
      queryFn: async (): Promise<TRow | null> => {
        if (!babyId) return null;
        const res = await getDb()
          .select()
          .from(table)
          .where(and(
            eq(table.babyId, babyId),
            inArray(table.status, ['active', 'paused']),
          ))
          .orderBy(desc(table.startedAt))
          .limit(1);
        return (res as TRow[])[0] ?? null;
      },
    }) as UseQueryResult<TRow | null, Error>;
  }

  function useSessionDetail(sessionId?: string) {
    return useQuery({
      queryKey: [queryKey, 'detail', sessionId],
      enabled: !!sessionId,
      queryFn: async (): Promise<TRow | null> => {
        if (!sessionId) return null;
        const res = await getDb()
          .select()
          .from(table)
          .where(eq(table.id, sessionId))
          .limit(1);
        return (res as TRow[])[0] ?? null;
      },
    }) as UseQueryResult<TRow | null, Error>;
  }

  function useSessionHistory(babyId?: string, limit = 20) {
    return useQuery({
      queryKey: [queryKey, 'history', babyId],
      enabled: !!babyId,
      queryFn: async (): Promise<TRow[]> => {
        if (!babyId) return [];
        return getDb()
          .select()
          .from(table)
          .where(eq(table.babyId, babyId))
          .orderBy(desc(table.startedAt))
          .limit(limit) as Promise<TRow[]>;
      },
    }) as UseQueryResult<TRow[], Error>;
  }

  function useStatusEvents(sessionId?: string) {
    return useQuery({
      queryKey: [queryKey + '_status_events', sessionId],
      enabled: !!sessionId,
      staleTime: 0,
      queryFn: async () => {
        if (!sessionId) return [] as TStatusRow[];
        return getDb()
          .select()
          .from(statusEventsTable)
          .where(eq(statusEventsTable.sessionId, sessionId))
          .orderBy(statusEventsTable.timestamp) as Promise<TStatusRow[]>;
      },
    }) as UseQueryResult<TStatusRow[], Error>;
  }

  function useStartSession() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: any) => {
        const db = getDb();
        const profileId = await resolveProfileId();
        const now = new Date();

        const existing = await db
          .select()
          .from(table)
          .where(and(
            eq(table.babyId, input.babyId),
            inArray(table.status, ['active', 'paused']),
          ))
          .limit(1);

        if ((existing as TRow[])[0]) {
          await _finishSession((existing as TRow[])[0].id, profileId, now);
        }

        const sessionId = generateId();
        const extra = startExtra ? startExtra(input) : {};
        await db.insert(table).values({
          id: sessionId,
          babyId: input.babyId,
          profileId,
          status: 'active',
          startedAt: now,
          createdAt: now,
          ...extra,
        });

        await db.insert(statusEventsTable).values({
          id: generateId(),
          sessionId,
          profileId,
          type: 'start',
          timestamp: now,
        });

        return sessionId;
      },
      onSuccess: (_: any, vars: any) => {
        qc.invalidateQueries({ queryKey: [queryKey, 'active', vars.babyId] });
        qc.invalidateQueries({ queryKey: [queryKey, 'history', vars.babyId] });
        qc.invalidateQueries({ queryKey: ['timeline'] });
        extraInvalidations?.start?.(vars).forEach((k) => qc.invalidateQueries({ queryKey: k }));
      },
      onError: onMutationError(`[useStart${tag}]`),
    });
  }

  function usePauseSession() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (session: any) => {
        const db = getDb();
        const profileId = await resolveProfileId();
        const now = new Date();
        await db.insert(statusEventsTable).values({
          id: generateId(), sessionId: session.id,
          profileId, type: 'pause', timestamp: now,
        });
        await db.update(table)
          .set({ status: 'paused' })
          .where(eq(table.id, session.id));
      },
      onSuccess: (_: any, session: any) => {
        qc.invalidateQueries({ queryKey: [queryKey, 'active', session.babyId] });
        qc.invalidateQueries({ queryKey: [queryKey + '_status_events', session.id] });
      },
      onError: onMutationError(`[usePause${tag}]`),
    });
  }

  function useResumeSession() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (session: any) => {
        const db = getDb();
        const profileId = await resolveProfileId();
        const now = new Date();
        await db.insert(statusEventsTable).values({
          id: generateId(), sessionId: session.id,
          profileId, type: 'resume', timestamp: now,
        });
        await db.update(table)
          .set({ status: 'active' })
          .where(eq(table.id, session.id));
      },
      onSuccess: (_: any, session: any) => {
        qc.invalidateQueries({ queryKey: [queryKey, 'active', session.babyId] });
        qc.invalidateQueries({ queryKey: [queryKey + '_status_events', session.id] });
      },
      onError: onMutationError(`[useResume${tag}]`),
    });
  }

  function useFinishSession() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (session: any) => {
        const profileId = await resolveProfileId();
        await _finishSession(session.id, profileId, new Date());
      },
      onSuccess: (_: any, session: any) => {
        qc.invalidateQueries({ queryKey: [queryKey, 'active', session.babyId] });
        qc.invalidateQueries({ queryKey: [queryKey, 'history', session.babyId] });
        qc.invalidateQueries({ queryKey: ['timeline'] });
        extraInvalidations?.finish?.(session).forEach((k) => qc.invalidateQueries({ queryKey: k }));
      },
      onError: onMutationError(`[useFinish${tag}]`),
    });
  }

  async function _finishSession(sessionId: string, profileId: string, now: Date) {
    const db = getDb();
    await db.insert(statusEventsTable).values({
      id: generateId(), sessionId, profileId,
      type: 'finish', timestamp: now,
    });
    const events = await db
      .select()
      .from(statusEventsTable)
      .where(eq(statusEventsTable.sessionId, sessionId))
      .orderBy(statusEventsTable.timestamp) as TStatusRow[];
    const durationSec = calcDurationSec(events as any);
    await db.update(table)
      .set({ status: 'finished', endedAt: now, durationSec })
      .where(eq(table.id, sessionId));
  }

  function useUpdateSession() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: any) => {
        const db = getDb();
        const base: Record<string, any> = {
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          notes: input.notes,
        };
        const extra = updateExtra ? updateExtra(input) : {};
        await db.update(table)
          .set({ ...base, ...extra })
          .where(eq(table.id, input.id));

        if (input.startedAt && input.endedAt) {
          const durationSec = Math.round(
            (input.endedAt.getTime() - input.startedAt.getTime()) / 1000,
          );
          await db.update(table)
            .set({ durationSec })
            .where(eq(table.id, input.id));
        }
      },
      onSuccess: (_: any, vars: any) => {
        qc.invalidateQueries({ queryKey: [queryKey, 'detail', vars.id] });
        qc.invalidateQueries({ queryKey: [queryKey, 'history', vars.babyId] });
        qc.invalidateQueries({ queryKey: ['timeline'] });
      },
      onError: onMutationError(`[useUpdate${tag}]`),
    });
  }

  return {
    useActiveSession,
    useSessionDetail,
    useSessionHistory,
    useStatusEvents,
    useStartSession,
    usePauseSession,
    useResumeSession,
    useFinishSession,
    _finishSession,
    useUpdateSession,
  };
}
