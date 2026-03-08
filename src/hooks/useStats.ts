/**
 * useStats — estadísticas por rango de fechas con comparación vs período anterior.
 *
 * Soporta: 'day' | 'week' | 'month' | 'year'
 * Para cada rango calcula período actual Y período anterior (para el "vs").
 * Incluye: tomas, sueño, pañales, comportamiento entre tomas, crecimiento.
 */
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { feedingSessions, sleepSessions, timelineEvents, growthLogs } from '@/src/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
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
      const day   = d.getDay();
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
    case 'day':   d.setDate(d.getDate() - 1);         break;
    case 'week':  d.setDate(d.getDate() - 7);         break;
    case 'month': d.setMonth(d.getMonth() - 1);       break;
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

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface InterFeedingEvent {
  typeId:             string;
  count:              number;
  avgMinAfterFeeding: number | null;
}

export interface GrowthPoint {
  timestamp:   Date;
  weightGrams: number | null;
  heightMm:    number | null;
  headCircMm:  number | null;
}

export interface PeriodStats {
  // Tomas
  feedingCount:        number;
  feedingTotalSec:     number;
  feedingAvgSec:       number;
  feedingByType:       Record<string, number>;
  feedingBySubtype:    Record<string, number>;
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
  eventsByType:        Record<string, number>;
  // Comportamiento entre tomas
  interFeedingEvents:  InterFeedingEvent[];
  // Crecimiento
  growthHistory:       GrowthPoint[];
  latestGrowth:        GrowthPoint | null;
  // Imágenes de pañal
  diaperImageUris:     string[];
  range:               { start: Date; end: Date };
}

// ─── Cálculo de stats ─────────────────────────────────────────────────────────

function computeStats(
  feedings:     any[],
  sleeps:       any[],
  events:       any[],
  growthPoints: any[],
  latestGrow:   any | null,
  range:        { start: Date; end: Date },
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
    if (f.bottleSubtype)
      feedingBySubtype[f.bottleSubtype] = (feedingBySubtype[f.bottleSubtype] ?? 0) + 1;
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
  for (const ev of events)
    eventsByType[ev.eventTypeId] = (eventsByType[ev.eventTypeId] ?? 0) + 1;

  // ── Comportamiento entre tomas ──
  // Para cada evento (no pañal-ya contado, burp, vomit, etc.) calculamos
  // cuántos minutos después de la toma más reciente ocurrió.
  const interFeedingEvents: InterFeedingEvent[] = [];
  const nonDiaperTypes = Object.keys(eventsByType).filter(k => k !== 'diaper');

  for (const typeId of nonDiaperTypes) {
    const eventsOfType = events.filter(e => e.eventTypeId === typeId);
    let totalMinAfter  = 0;
    let countWithFeeding = 0;

    for (const ev of eventsOfType) {
      const evTs = new Date(ev.timestamp).getTime();
      // Encontrar la última toma terminada antes de este evento
      const prevFeeding = finishedFeedings
        .filter(f => {
          const endTs = f.endedAt ? new Date(f.endedAt).getTime() : new Date(f.startedAt).getTime();
          return endTs < evTs;
        })
        .sort((a, b) => {
          const aTs = a.endedAt ? new Date(a.endedAt).getTime() : new Date(a.startedAt).getTime();
          const bTs = b.endedAt ? new Date(b.endedAt).getTime() : new Date(b.startedAt).getTime();
          return bTs - aTs;
        })[0];

      if (prevFeeding) {
        const feedEnd = prevFeeding.endedAt
          ? new Date(prevFeeding.endedAt).getTime()
          : new Date(prevFeeding.startedAt).getTime();
        totalMinAfter += Math.round((evTs - feedEnd) / 60000);
        countWithFeeding++;
      }
    }

    interFeedingEvents.push({
      typeId,
      count:              eventsOfType.length,
      avgMinAfterFeeding: countWithFeeding > 0
        ? Math.round(totalMinAfter / countWithFeeding)
        : null,
    });
  }

  // Ordenar por frecuencia
  interFeedingEvents.sort((a, b) => b.count - a.count);

  // ── Crecimiento ──
  const growthHistory: GrowthPoint[] = growthPoints.map(g => ({
    timestamp:   g.timestamp instanceof Date ? g.timestamp : new Date(Number(g.timestamp)),
    weightGrams: g.weightGrams ?? null,
    heightMm:    g.heightMm   ?? null,
    headCircMm:  g.headCircMm ?? null,
  }));

  const latestGrowth: GrowthPoint | null = latestGrow ? {
    timestamp:   latestGrow.timestamp instanceof Date ? latestGrow.timestamp : new Date(Number(latestGrow.timestamp)),
    weightGrams: latestGrow.weightGrams ?? null,
    heightMm:    latestGrow.heightMm   ?? null,
    headCircMm:  latestGrow.headCircMm ?? null,
  } : null;

  return {
    feedingCount, feedingTotalSec, feedingAvgSec, feedingByType, feedingBySubtype,
    sleepCount, sleepTotalSec, sleepAvgSec,
    diaperCount, diaperPeeAvg, diaperPoopAvg, diaperWithPoop,
    eventsByType, interFeedingEvents, growthHistory, latestGrowth,
    diaperImageUris, range,
  };
}

// ─── Consulta a la DB ─────────────────────────────────────────────────────────

async function fetchStatsForRange(
  babyId: string,
  bounds: { start: Date; end: Date },
): Promise<PeriodStats> {
  const db = getDb();

  const [feedings, sleeps, events, growthInRange, latestGrowthArr] = await Promise.all([
    db.select().from(feedingSessions)
      .where(and(eq(feedingSessions.babyId, babyId),
        gte(feedingSessions.startedAt, bounds.start),
        lte(feedingSessions.startedAt, bounds.end))),
    db.select().from(sleepSessions)
      .where(and(eq(sleepSessions.babyId, babyId),
        gte(sleepSessions.startedAt, bounds.start),
        lte(sleepSessions.startedAt, bounds.end))),
    db.select().from(timelineEvents)
      .where(and(eq(timelineEvents.babyId, babyId),
        gte(timelineEvents.timestamp, bounds.start),
        lte(timelineEvents.timestamp, bounds.end))),
    // Crecimiento en el período
    db.select().from(growthLogs)
      .where(and(eq(growthLogs.babyId, babyId),
        gte(growthLogs.timestamp, bounds.start),
        lte(growthLogs.timestamp, bounds.end)))
      .orderBy(desc(growthLogs.timestamp)),
    // Último crecimiento hasta el fin del período (puede ser de antes)
    db.select().from(growthLogs)
      .where(and(eq(growthLogs.babyId, babyId),
        lte(growthLogs.timestamp, bounds.end)))
      .orderBy(desc(growthLogs.timestamp))
      .limit(1),
  ]);

  return computeStats(feedings, sleeps, events, growthInRange, latestGrowthArr[0] ?? null, bounds);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export interface StatsResult {
  current:    PeriodStats;
  previous:   PeriodStats;
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
      const prevRefDate = (() => {
        const d = new Date(refDate);
        switch (range) {
          case 'day':   d.setDate(d.getDate() - 1);         break;
          case 'week':  d.setDate(d.getDate() - 7);         break;
          case 'month': d.setMonth(d.getMonth() - 1);       break;
          case 'year':  d.setFullYear(d.getFullYear() - 1); break;
        }
        return d;
      })();
      return {
        current, previous,
        rangeLabel: formatRangeLabel(range, refDate),
        prevLabel:  formatRangeLabel(range, prevRefDate),
      };
    },
  });
}
