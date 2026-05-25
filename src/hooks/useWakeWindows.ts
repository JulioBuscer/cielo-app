import { useMemo } from "react";

interface SleepSessionInput {
  id: string;
  startedAt: Date | number;
  endedAt: Date | number | null;
  status?: string;
}

export interface WakeWindow {
  previousSleepId: string;
  nextSleepId: string;
  durationMs: number;
  windowIndex: number;
  startMs: number;
  endMs: number;
}

const WAKE_REFERENCE: Array<{
  minDays: number;
  maxDays: number;
  minMin: number;
  maxMin: number;
}> = [
  { minDays: 0, maxDays: 28, minMin: 35, maxMin: 60 },
  { minDays: 29, maxDays: 60, minMin: 60, maxMin: 90 },
  { minDays: 61, maxDays: 120, minMin: 75, maxMin: 120 },
  { minDays: 121, maxDays: 210, minMin: 120, maxMin: 180 },
  { minDays: 211, maxDays: 300, minMin: 150, maxMin: 210 },
  { minDays: 301, maxDays: 420, minMin: 180, maxMin: 270 },
  { minDays: 421, maxDays: 720, minMin: 240, maxMin: 360 },
  { minDays: 721, maxDays: Infinity, minMin: 300, maxMin: 420 },
];

export function getWakeReference(ageDays: number): {
  minMin: number;
  maxMin: number;
} {
  for (const ref of WAKE_REFERENCE) {
    if (ageDays >= ref.minDays && ageDays <= ref.maxDays) {
      return { minMin: ref.minMin, maxMin: ref.maxMin };
    }
  }
  return { minMin: 120, maxMin: 180 };
}

export function useWakeWindows(
  sleepHistory?: SleepSessionInput[],
  babyBirthDate?: Date | null,
): WakeWindow[] {
  return useMemo(() => {
    if (!sleepHistory || sleepHistory.length < 2) return [];

    const finished = sleepHistory
      .filter((s) => {
        const end = s.endedAt ? new Date(s.endedAt).getTime() : 0;
        const start = new Date(s.startedAt).getTime();
        return start > 0 && end > 0;
      })
      .map((s) => ({
        id: s.id,
        start: new Date(s.startedAt).getTime(),
        end: new Date(s.endedAt!).getTime(),
      }))
      .filter((s) => s.end > s.start)
      .sort((a, b) => a.start - b.start);

    const windows: WakeWindow[] = [];
    let windowCount = 0;
    let prevDayStr = "";

    for (let i = 0; i < finished.length - 1; i++) {
      const prev = finished[i];
      const next = finished[i + 1];
      const curDay = new Date(prev.start).toDateString();

      if (curDay !== prevDayStr) {
        windowCount = 0;
        prevDayStr = curDay;
      }

      const nextDay = new Date(next.start).toDateString();
      if (curDay !== nextDay) continue;

      const gapMs = next.start - prev.end;
      if (gapMs < 0) continue;

      windowCount++;
      windows.push({
        previousSleepId: prev.id,
        nextSleepId: next.id,
        durationMs: gapMs,
        windowIndex: windowCount,
        startMs: prev.end,
        endMs: next.start,
      });
    }

    return windows;
  }, [sleepHistory]);
}

export function formatWakeWindow(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
