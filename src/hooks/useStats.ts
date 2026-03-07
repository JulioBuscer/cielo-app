/**
 * useStats — estadísticas por rango de fechas con comparación vs período anterior.
 *
 * Soporta: 'day' | 'week' | 'month' | 'year'
 * Para cada rango calcula período actual Y período anterior (para el "vs").
 */
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { feedingSessions, sleepSessions, timelineEvents } from '@/src/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { DiaperMetadata } from '@/src/db/schema';

export type RangeType = 'day' | 'week' | 'month' | 'year';

// ─── Helpers de rango ─────────────────────────────────────────────────────────

export function getRangeBounds(range: RangeType, ref: Date): { start: Date; end: Date } {
  const d = new Date(ref);
  switch (range) {
    case 'day': {
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'week': {
      const day   = d.getDay(); // 0=Dom
      const start = new Date(d); start.setDate(d.getDate() - day); start.setHours(0, 0, 0, 0);
      const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'month': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'year': {
      const start = new Date(d.getFullYear(), 0, 1);
      const end   = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

export function getPrevRangeBounds(range: RangeType, ref: Date): { start: Date; end: Date } {
  const d = new Date(ref);
  switch (range) {
    case 'day':   d.setDate(d.getDate() - 1);   break;
    case 'week':  d.setDate(d.getDate() - 7);   break;
    case 'month': d.setMonth(d.getMonth() - 1); break;
    case 'year':  d.setFullYear(d.getFullYear() - 1); break;
  }
  return getRangeBounds(range, d);
}

export function formatRangeLabel(range: RangeType, ref: Date): string {
  const { start, end } = getRangeBounds(range, ref);
  const isToday = new Date().toDateString() === ref.toDateString();
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  switch (range) {
    case 'day':
      return isToday ? 'Hoy' : start.toLocaleDateString('es-MX', { ...opts, year: 'numeric' });
    case 'week':
      return `${start.toLocaleDateString('es-MX', opts)} – ${end.toLocaleDateString('es-MX', opts)}`;
    case 'month':
      return start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    case 'year':
      return String(start.getFullYear());
  }
}

// ─── Tipo resultado ──────────────────────────────────────────────────────────

export interface PeriodStats {
  // Tomas
  feedingCount:        number;
  feedingTotalSec:     number;
  feedingAvgSec:       number;
  feedingByType:       Record<string, number>;       // type → count
  feedingBySubtype:    Record<string, number>;       // bottleSubtype → count
  // Sueño
  sleepCount:          number;
  sleepTotalSec:       number;
  sleepAvgSec:         number;
  // Pañales
  diaperCount:         number;
  diaperPeeAvg:        number;
  diaperPoopAvg:       number;
  diaperWithPoop:      number;
  // Otros eventos
  eventsByType:        Record<string, number>;       // eventTypeId → count
  // Imágenes de pañal del período
  diaperImageUris:     string[];
  // Metadata raw para compartir
  range:               { start: Date; end: Date };
}

// ─── Cálculo de stats desde datos ────────────────────────────────────────────

function computeStats(
  feedings: any[],
  sleeps:   any[],
  events:   any[],
  range:    { start: Date; end: Date }
): PeriodStats {
  // ── Tomas ──
  const finishedFeedings = feedings.filter(f => f.status === 'finished');
  const feedingCount     = finishedFeedings.length;
  const feedingTotalSec  = finishedFeedings.reduce((s, f) => s + (f.durationSec ?? 0), 0);
  const feedingAvgSec    = feedingCount > 0 ? Math.round(feedingTotalSec / feedingCount) : 0;
  const feedingByType: Record<string, number> = {};
  const feedingBySubtype: Record<string, number> = {};
  for (const f of finishedFeedings) {
    feedingByType[f.type] = (feedingByType[f.type] ?? 0) + 1;
    if (f.bottleSubtype) {
      feedingBySubtype[f.bottleSubtype] = (feedingBySubtype[f.bottleSubtype] ?? 0) + 1;
    }
  }

  // ── Sueño ──
  const finishedSleeps = sleeps.filter(s => s.status === 'finished');
  const sleepCount     = finishedSleeps.length;
  const sleepTotalSec  = finishedSleeps.reduce((s, sl) => s + (sl.durationSec ?? 0), 0);
  const sleepAvgSec    = sleepCount > 0 ? Math.round(sleepTotalSec / sleepCount) : 0;

  // ── Pañales ──
  const diaperEvents = events.filter(e => e.eventTypeId === 'diaper');
  const diaperCount  = diaperEvents.length;
  let diaperPeeTotal = 0, diaperPoopTotal = 0, diaperWithPoop = 0;
  const diaperImageUris: string[] = [];
  for (const ev of diaperEvents) {
    try {
      const meta: DiaperMetadata = ev.metadata ? JSON.parse(ev.metadata) : {};
      diaperPeeTotal  += meta.peeIntensity  ?? 0;
      diaperPoopTotal += meta.poopIntensity ?? 0;
      if ((meta.poopIntensity ?? 0) > 0) diaperWithPoop++;
      if (meta.imageUri) diaperImageUris.push(meta.imageUri);
    } catch {}
  }
  const diaperPeeAvg  = diaperCount > 0 ? Math.round((diaperPeeTotal  / diaperCount) * 10) / 10 : 0;
  const diaperPoopAvg = diaperCount > 0 ? Math.round((diaperPoopTotal / diaperCount) * 10) / 10 : 0;

  // ── Otros eventos ──
  const eventsByType: Record<string, number> = {};
  for (const ev of events) {
    eventsByType[ev.eventTypeId] = (eventsByType[ev.eventTypeId] ?? 0) + 1;
  }

  return {
    feedingCount, feedingTotalSec, feedingAvgSec, feedingByType, feedingBySubtype,
    sleepCount, sleepTotalSec, sleepAvgSec,
    diaperCount, diaperPeeAvg, diaperPoopAvg, diaperWithPoop, diaperImageUris,
    eventsByType, range,
  };
}

// ─── Consulta a la DB por rango ───────────────────────────────────────────────

async function fetchStatsForRange(
  babyId: string,
  bounds: { start: Date; end: Date }
): Promise<PeriodStats> {
  const db = getDb();

  const [feedings, sleeps, events] = await Promise.all([
    db.select().from(feedingSessions)
      .where(and(
        eq(feedingSessions.babyId, babyId),
        gte(feedingSessions.startedAt, bounds.start),
        lte(feedingSessions.startedAt, bounds.end)
      )),
    db.select().from(sleepSessions)
      .where(and(
        eq(sleepSessions.babyId, babyId),
        gte(sleepSessions.startedAt, bounds.start),
        lte(sleepSessions.startedAt, bounds.end)
      )),
    db.select().from(timelineEvents)
      .where(and(
        eq(timelineEvents.babyId, babyId),
        gte(timelineEvents.timestamp, bounds.start),
        lte(timelineEvents.timestamp, bounds.end)
      )),
  ]);

  return computeStats(feedings, sleeps, events, bounds);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export interface StatsResult {
  current:  PeriodStats;
  previous: PeriodStats;
  rangeLabel: string;
  prevLabel:  string;
}

export function useStats(babyId?: string, range: RangeType = 'day', refDate: Date = new Date()) {
  return useQuery({
    queryKey: ['stats', babyId, range, refDate.toDateString()],
    enabled:  !!babyId,
    queryFn: async (): Promise<StatsResult> => {
      if (!babyId) throw new Error('No babyId');
      const currBounds = getRangeBounds(range, refDate);
      const prevBounds = getPrevRangeBounds(range, refDate);
      const [current, previous] = await Promise.all([
        fetchStatsForRange(babyId, currBounds),
        fetchStatsForRange(babyId, prevBounds),
      ]);
      return {
        current, previous,
        rangeLabel: formatRangeLabel(range, refDate),
        prevLabel:  formatRangeLabel(range, (() => {
          const d = new Date(refDate);
          switch (range) {
            case 'day':   d.setDate(d.getDate() - 1);         break;
            case 'week':  d.setDate(d.getDate() - 7);         break;
            case 'month': d.setMonth(d.getMonth() - 1);       break;
            case 'year':  d.setFullYear(d.getFullYear() - 1); break;
          }
          return d;
        })()),
      };
    },
  });
}
