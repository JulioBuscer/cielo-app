import { useEffect, useRef, useState } from 'react';
import { sleepSessions, sleepStatusEvents } from '@/src/db/schema';
import { createSessionHooks } from './useSession';
import type { SleepSession, SleepStatusEvent } from '@/src/db/schema';

// ─── FACTORY HOOKS ───────────────────────────────────────────────────────────

const hooks = createSessionHooks<SleepSession, SleepStatusEvent>({
  table:             sleepSessions,
  statusEventsTable: sleepStatusEvents,
  queryKey:          'sleep_session',
  tag:               'Sleep',
});

export const useActiveSleepSession = hooks.useActiveSession;
export const useSleepSession       = hooks.useSessionDetail;
export const useSleepHistory       = hooks.useSessionHistory;
export const useSleepStatusEvents  = hooks.useStatusEvents;
export const useStartSleep         = hooks.useStartSession;
export const usePauseSleep         = hooks.usePauseSession;
export const useResumeSleep        = hooks.useResumeSession;
export const useFinishSleep        = hooks.useFinishSession;
export const useUpdateSleepSession = hooks.useUpdateSession;

// ─── HOOK: Timer preciso de sueño ────────────────────────────────────────────

export function useSleepPreciseElapsed(session: SleepSession | null | undefined): number {
  const { data: events } = useSleepStatusEvents(session?.id ?? '');
  const [, setTick]      = useState(0);
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session?.status === 'active') {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session?.status]);

  if (!session || !events || events.length === 0) return 0;

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
