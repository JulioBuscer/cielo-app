import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { feedingSessions, feedingStatusEvents } from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { onMutationError } from '@/src/utils/mutationError';
import { createSessionHooks } from './useSession';

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

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

// ─── FACTORY HOOKS ───────────────────────────────────────────────────────────

import type { FeedingSession, FeedingStatusEvent } from '@/src/db/schema';

const hooks = createSessionHooks<FeedingSession, FeedingStatusEvent>({
  table:             feedingSessions,
  statusEventsTable: feedingStatusEvents,
  queryKey:          'feeding_session',
  tag:               'Feeding',
  startExtra:        (input: { type: FeedingType; bottleSubtype?: BottleSubtype }) => ({
    type:          input.type,
    bottleSubtype: input.bottleSubtype ?? null,
  }),
  updateExtra:       (input: { type?: FeedingType; bottleSubtype?: BottleSubtype | null }) => ({
    type:          input.type,
    bottleSubtype: input.bottleSubtype,
  }),
  extraInvalidations: {
    finish: (session) => [['feeding_session', 'last', session.babyId]],
  },
});

export const useActiveFeedingSession = hooks.useActiveSession;
export const useFeedingSession       = hooks.useSessionDetail;
export const useFeedingHistory       = hooks.useSessionHistory;
export const useFeedingStatusEvents  = hooks.useStatusEvents;
export const useStartFeeding         = hooks.useStartSession;
export const usePauseFeeding         = hooks.usePauseSession;
export const useResumeFeeding        = hooks.useResumeSession;
export const useFinishFeeding        = hooks.useFinishSession;
export const useUpdateFeedingSession = hooks.useUpdateSession;

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
            eq(feedingSessions.status, 'finished'),
          )
        )
        .orderBy(desc(feedingSessions.startedAt))
        .limit(1);
      return res[0] ?? null;
    },
  });
}

// ─── MUTATION: Crear toma rezagada (retroactiva) ───────────────────────────────

export function useCreateRetroFeeding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId:        string;
      profileId:     string;
      type:          FeedingType;
      bottleSubtype?: BottleSubtype | null;
      startedAt:     Date;
      endedAt:       Date;
    }) => {
      const db = getDb();
      const sessionId = generateId();
      const durationSec = Math.round(
        (input.endedAt.getTime() - input.startedAt.getTime()) / 1000,
      );

      await db.insert(feedingSessions).values({
        id:            sessionId,
        babyId:        input.babyId,
        profileId:     input.profileId,
        type:          input.type,
        bottleSubtype: input.type === "bottle" ? (input.bottleSubtype ?? null) : null,
        status:        "finished",
        startedAt:     input.startedAt,
        endedAt:       input.endedAt,
        durationSec,
        createdAt:     new Date(),
      });

      await db.insert(feedingStatusEvents).values([
        { id: generateId(), sessionId, profileId: input.profileId, type: "start",  timestamp: input.startedAt },
        { id: generateId(), sessionId, profileId: input.profileId, type: "finish", timestamp: input.endedAt },
      ]);

      return sessionId;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['feeding_session'] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
    onError: onMutationError("[useCreateRetroFeeding]"),
  });
}
