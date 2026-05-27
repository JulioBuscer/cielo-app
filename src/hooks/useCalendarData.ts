import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import {
  timelineEvents,
  feedingSessions,
  sleepSessions,
  growthLogs,
  foodLogs,
} from "@/src/db/schema";

export interface DayEvents {
  date: string; // YYYY-MM-DD
  types: Set<string>;
  hasPee: boolean;
  hasPoop: boolean;
  hasFeeding: boolean;
  hasSleep: boolean;
  hasMeasurement: boolean;
  hasFood: boolean;
  hasHealth: boolean;
  hasOther: boolean;
  total: number;
}

function getMonthBounds(ref: Date) {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function useCalendarData(babyId?: string, ref?: Date) {
  const monthRef = useMemo(() => ref ?? new Date(), [ref]);
  const bounds = useMemo(() => getMonthBounds(monthRef), [monthRef]);
  const monthKey = `${monthRef.getFullYear()}-${monthRef.getMonth()}`;

  return useQuery({
    queryKey: ["calendar", babyId, monthKey],
    enabled: !!babyId,
    queryFn: async () => {
      if (!babyId) return { days: new Map<string, DayEvents>(), bounds };
      const db = getDb();

      const [events, feedings, sleeps, growths, foods] = await Promise.all([
        db
          .select()
          .from(timelineEvents)
          .where(
            and(
              eq(timelineEvents.babyId, babyId),
              gte(timelineEvents.timestamp, bounds.start),
              lte(timelineEvents.timestamp, bounds.end)
            )
          ),
        db
          .select()
          .from(feedingSessions)
          .where(
            and(
              eq(feedingSessions.babyId, babyId),
              gte(feedingSessions.startedAt, bounds.start),
              lte(feedingSessions.startedAt, bounds.end)
            )
          ),
        db
          .select()
          .from(sleepSessions)
          .where(
            and(
              eq(sleepSessions.babyId, babyId),
              gte(sleepSessions.startedAt, bounds.start),
              lte(sleepSessions.startedAt, bounds.end)
            )
          ),
        db
          .select()
          .from(growthLogs)
          .where(
            and(
              eq(growthLogs.babyId, babyId),
              gte(growthLogs.timestamp, bounds.start),
              lte(growthLogs.timestamp, bounds.end)
            )
          ),
        db
          .select()
          .from(foodLogs)
          .where(
            and(
              eq(foodLogs.babyId, babyId),
              gte(foodLogs.timestamp, bounds.start),
              lte(foodLogs.timestamp, bounds.end)
            )
          ),
      ]);

      const days = new Map<string, DayEvents>();

      const addDay = (ts: Date, type: string) => {
        const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
        let d = days.get(key);
        if (!d) {
          d = {
            date: key,
            types: new Set(),
            hasPee: false,
            hasPoop: false,
            hasFeeding: false,
            hasSleep: false,
            hasMeasurement: false,
            hasFood: false,
            hasHealth: false,
            hasOther: false,
            total: 0,
          };
          days.set(key, d);
        }
        d.types.add(type);
        if (type === "food") d.hasFood = true;
        d.total++;
      };

      for (const e of events) {
        if (e.eventTypeId === "diaper") {
          const meta = e.metadata as any;
          const values = e.values as any;
          const pi = values?.poop ?? meta?.poopIntensity ?? 0;
          const ph = values?.poopHealth ?? meta?.poopHealth ?? 0;
          const pc = values?.poopConsistency ?? meta?.poopConsistency ?? 0;
          const peeLevel = values?.pee ?? meta?.peeIntensity ?? 0;
          const peeHealth = values?.peeHealth ?? meta?.peeHealth ?? 0;
          if (pi > 0 || ph > 0 || pc > 0) addDay(new Date(e.timestamp), "poop");
          if (peeLevel > 0 || peeHealth > 0) addDay(new Date(e.timestamp), "pee");
        } else if (["weight", "height"].includes(e.eventTypeId)) {
          addDay(new Date(e.timestamp), "measurement");
        } else if (
          ["medication", "temperature", "vomit", "regurgitation"].includes(e.eventTypeId)
        ) {
          addDay(new Date(e.timestamp), "health");
        } else {
          addDay(new Date(e.timestamp), "other");
        }
      }

      for (const f of feedings) {
        addDay(new Date(f.startedAt), "feeding");
      }
      for (const s of sleeps) {
        if (s.status === "finished") addDay(new Date(s.startedAt), "sleep");
      }
      for (const g of growths) {
        addDay(new Date(g.timestamp), "measurement");
      }
      for (const f of foods) {
        addDay(new Date(f.timestamp), "food");
      }

      return { days, bounds };
    },
  });
}

export function useDayEvents(babyId?: string, dayStart?: Date, dayEnd?: Date, enabled = true) {
  return useQuery({
    queryKey: ["dayEvents", babyId, dayStart?.getTime()],
    enabled: !!babyId && enabled,
    queryFn: async () => {
      if (!babyId) return null;
      const db = getDb();
      const [events, feedings, sleeps, growths, foods] = await Promise.all([
        db
          .select()
          .from(timelineEvents)
          .where(and(eq(timelineEvents.babyId, babyId), gte(timelineEvents.timestamp, dayStart!), lte(timelineEvents.timestamp, dayEnd!)))
          .orderBy(timelineEvents.timestamp),
        db
          .select()
          .from(feedingSessions)
          .where(and(eq(feedingSessions.babyId, babyId), gte(feedingSessions.startedAt, dayStart!), lte(feedingSessions.startedAt, dayEnd!)))
          .orderBy(feedingSessions.startedAt),
        db
          .select()
          .from(sleepSessions)
          .where(and(eq(sleepSessions.babyId, babyId), gte(sleepSessions.startedAt, dayStart!), lte(sleepSessions.startedAt, dayEnd!)))
          .orderBy(sleepSessions.startedAt),
        db
          .select()
          .from(growthLogs)
          .where(and(eq(growthLogs.babyId, babyId), gte(growthLogs.timestamp, dayStart!), lte(growthLogs.timestamp, dayEnd!)))
          .orderBy(growthLogs.timestamp),
        db
          .select()
          .from(foodLogs)
          .where(and(eq(foodLogs.babyId, babyId), gte(foodLogs.timestamp, dayStart!), lte(foodLogs.timestamp, dayEnd!)))
          .orderBy(foodLogs.timestamp),
      ]);
      return { events, feedings, sleeps, growths, foods };
    },
  });
}

export function useWeekSummary(babyId?: string) {
  return useQuery({
    queryKey: ["weekSummary", babyId],
    enabled: !!babyId,
    queryFn: async () => {
      if (!babyId) return [];
      const db = getDb();
      const days: { dateKey: string; diapers: number; feeds: number; sleepMs: number; foods: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        const [events, feedings, sleeps, foods] = await Promise.all([
          db.select().from(timelineEvents)
            .where(and(eq(timelineEvents.babyId, babyId), gte(timelineEvents.timestamp, start), lte(timelineEvents.timestamp, end)))
            .orderBy(timelineEvents.timestamp),
          db.select().from(feedingSessions)
            .where(and(eq(feedingSessions.babyId, babyId), gte(feedingSessions.startedAt, start), lte(feedingSessions.startedAt, end))),
          db.select().from(sleepSessions)
            .where(and(eq(sleepSessions.babyId, babyId), gte(sleepSessions.startedAt, start), lte(sleepSessions.startedAt, end))),
          db.select().from(foodLogs)
            .where(and(eq(foodLogs.babyId, babyId), gte(foodLogs.timestamp, start), lte(foodLogs.timestamp, end))),
        ]);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const sleepMs = sleeps.reduce((acc, s) => {
          if (s.status !== "finished" || !s.endedAt) return acc;
          return acc + (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime());
        }, 0);
        days.push({ dateKey, diapers: events.filter((e) => e.eventTypeId === "diaper").length, feeds: feedings.length, sleepMs, foods: foods.length });
      }
      return days;
    },
  });
}
