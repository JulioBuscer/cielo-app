import { useQuery } from '@tanstack/react-query';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '@/src/db/client';
import { timelineEvents, feedingSessions, sleepSessions, growthLogs, foodLogs } from '@/src/db/schema';

export function useHistoryData(babyId?: string, dateBounds?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ["history", babyId, dateBounds?.start.getTime(), dateBounds?.end.getTime()],
    enabled: !!babyId && !!dateBounds,
    queryFn: async () => {
      if (!babyId || !dateBounds) return null;
      const db = getDb();
      const { start, end } = dateBounds;

      const [events, feedings, sleeps, growths, foods] = await Promise.all([
        db
          .select()
          .from(timelineEvents)
          .where(and(eq(timelineEvents.babyId, babyId), gte(timelineEvents.timestamp, start), lte(timelineEvents.timestamp, end)))
          .orderBy(desc(timelineEvents.timestamp)),
        db
          .select()
          .from(feedingSessions)
          .where(and(eq(feedingSessions.babyId, babyId), gte(feedingSessions.startedAt, start), lte(feedingSessions.startedAt, end)))
          .orderBy(desc(feedingSessions.startedAt)),
        db
          .select()
          .from(sleepSessions)
          .where(and(eq(sleepSessions.babyId, babyId), gte(sleepSessions.startedAt, start), lte(sleepSessions.startedAt, end)))
          .orderBy(desc(sleepSessions.startedAt)),
        db
          .select()
          .from(growthLogs)
          .where(and(eq(growthLogs.babyId, babyId), gte(growthLogs.timestamp, start), lte(growthLogs.timestamp, end)))
          .orderBy(desc(growthLogs.timestamp)),
        db
          .select()
          .from(foodLogs)
          .where(and(eq(foodLogs.babyId, babyId), gte(foodLogs.timestamp, start), lte(foodLogs.timestamp, end)))
          .orderBy(desc(foodLogs.timestamp)),
      ]);
      return { events, feedings, sleeps, growths, foods };
    },
  });
}
