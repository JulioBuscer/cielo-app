import { useMemo } from "react";
import { useTimeline } from "@/src/hooks/useTimeline";
import { useFeedingHistory } from "@/src/hooks/useFeedingSessions";
import { useSleepHistory } from "@/src/hooks/useSleepSessions";

function isToday(date: Date | string | number) {
  const d = new Date(date);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

export function useChatSummary(babyId?: string) {
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { data: tlEvents } = useTimeline(babyId);
  const { data: sessions } = useFeedingHistory(babyId, 100);
  const { data: sleepHistory } = useSleepHistory(babyId, 100);

  return useMemo(() => {
    const todayEvents = (tlEvents ?? []).filter((e) => isToday(e.timestamp));
    const todaySessions = (sessions ?? []).filter(
      (s) => s.status === "finished" && isToday(s.startedAt),
    );
    const todaySleep = (sleepHistory ?? []).filter(
      (s) => s.status === "finished" && isToday(s.startedAt),
    );

    const diaperCount = todayEvents.filter((e) => e.eventTypeId === "diaper").length;
    const foodCount = todayEvents.filter((e) => e.eventTypeId === "food").length;
    const healthCount = todayEvents.filter((e) =>
      ["temperature", "medication"].includes(e.eventTypeId),
    ).length;
    const feedingCount = todaySessions.length;
    const sleepCount = todaySleep.length;

    const totalSleepMinutes = todaySleep.reduce((acc, s) => {
      return acc + (s.durationSec ? Math.round(s.durationSec / 60) : 0);
    }, 0);

    return {
      feedingCount,
      sleepCount,
      diaperCount,
      foodCount,
      healthCount,
      totalSleepMinutes,
      totalEvents:
        feedingCount + sleepCount + diaperCount + foodCount + healthCount,
    };
  }, [tlEvents, sessions, sleepHistory]);
}
