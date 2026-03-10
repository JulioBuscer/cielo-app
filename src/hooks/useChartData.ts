/**
 * useChartData — datos en series temporales para gráficas.
 *
 * Según el rango seleccionado genera buckets con conteos para:
 *   • Tomas (count)
 *   • Sueño (minutos)
 *   • Pañales (count)
 *
 * Para growth: carga TODOS los puntos históricos del bebé (sin límite de rango).
 */
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { feedingSessions, sleepSessions, timelineEvents, growthLogs } from '@/src/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getRangeBounds, type RangeType } from './useStats';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ChartBucket {
  label:   string;      // "3h", "Lun", "15", "Ene"
  feeding: number;      // count de tomas
  sleep:   number;      // minutos de sueño
  diaper:  number;      // count de pañales
}

export interface GrowthPoint {
  ts:          number;   // timestamp ms
  label:       string;   // "15 ene"
  weightKg:    number | null;
  heightCm:    number | null;
  headCircCm:  number | null;
}

export interface ChartData {
  buckets:       ChartBucket[];
  weightHistory: GrowthPoint[];
  heightHistory: GrowthPoint[];
  headHistory:   GrowthPoint[];
  hasGrowth:     boolean;
}

// ─── Helpers de bucket ────────────────────────────────────────────────────────

const DAYS_ES  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function buildBuckets(range: RangeType, ref: Date): { key: string; label: string }[] {
  const { start } = getRangeBounds(range, ref);
  switch (range) {
    case 'day': {
      return Array.from({ length: 24 }, (_, h) => ({
        key:   String(h),
        label: h % 3 === 0 ? `${h}h` : '',   // solo etiqueta cada 3h para no amontonar
      }));
    }
    case 'week': {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return { key: String(i), label: DAYS_ES[d.getDay()] };
      });
    }
    case 'month': {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => ({
        key:   String(i + 1),
        label: (i + 1) % 5 === 1 || i === daysInMonth - 1 ? String(i + 1) : '',
      }));
    }
    case 'year': {
      return MONTHS_ES.map((m, i) => ({ key: String(i), label: m }));
    }
  }
}

function getBucketIndex(range: RangeType, ref: Date, ts: Date): number {
  const { start } = getRangeBounds(range, ref);
  switch (range) {
    case 'day':   return ts.getHours();
    case 'week':  return Math.floor((ts.getTime() - start.getTime()) / 86400000);
    case 'month': return ts.getDate() - 1;
    case 'year':  return ts.getMonth();
  }
}

// Distribuir minutos de sueño a lo largo de los buckets que abarca la sesión
function distributeSleep(
  range: RangeType, ref: Date,
  startedAt: Date, endedAt: Date,
  durationSec: number,
  buckets: number[],
): void {
  const { start: rangeStart, end: rangeEnd } = getRangeBounds(range, ref);
  const clampedStart = new Date(Math.max(startedAt.getTime(), rangeStart.getTime()));
  const clampedEnd   = new Date(Math.min(endedAt.getTime(),   rangeEnd.getTime()));
  if (clampedEnd <= clampedStart) return;

  let cursor = new Date(clampedStart);
  while (cursor < clampedEnd) {
    const idx = getBucketIndex(range, ref, cursor);
    if (idx < 0 || idx >= buckets.length) break;

    // Fin del bucket actual
    let bucketEnd: Date;
    if (range === 'day') {
      bucketEnd = new Date(cursor); bucketEnd.setMinutes(0, 0, 0);
      bucketEnd.setHours(cursor.getHours() + 1);
    } else if (range === 'week' || range === 'month') {
      bucketEnd = new Date(cursor); bucketEnd.setHours(0, 0, 0, 0);
      bucketEnd.setDate(bucketEnd.getDate() + 1);
    } else {
      bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    const segEnd = new Date(Math.min(bucketEnd.getTime(), clampedEnd.getTime()));
    const segMin = Math.round((segEnd.getTime() - cursor.getTime()) / 60000);
    buckets[idx] += segMin;
    cursor = segEnd;
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useChartData(babyId?: string, range: RangeType = 'day', refDate: Date = new Date()) {
  return useQuery({
    queryKey: ['chart_data', babyId, range, refDate.toDateString()],
    enabled:  !!babyId,
    queryFn: async (): Promise<ChartData> => {
      if (!babyId) throw new Error('No babyId');

      const db     = getDb();
      const bounds = getRangeBounds(range, refDate);
      const defs   = buildBuckets(range, refDate);
      const n      = defs.length;

      const feedArr  = new Array<number>(n).fill(0);
      const sleepArr = new Array<number>(n).fill(0);
      const diaArr   = new Array<number>(n).fill(0);

      // ── Tomas ──────────────────────────────────────────────────────────────
      const feedings = await db.select().from(feedingSessions)
        .where(and(
          eq(feedingSessions.babyId, babyId),
          gte(feedingSessions.startedAt, bounds.start),
          lte(feedingSessions.startedAt, bounds.end),
          eq(feedingSessions.status, 'finished'),
        ));

      for (const f of feedings) {
        const idx = getBucketIndex(range, refDate, new Date(f.startedAt));
        if (idx >= 0 && idx < n) feedArr[idx]++;
      }

      // ── Sueño ───────────────────────────────────────────────────────────────
      const sleeps = await db.select().from(sleepSessions)
        .where(and(
          eq(sleepSessions.babyId, babyId),
          gte(sleepSessions.startedAt, bounds.start),
          lte(sleepSessions.startedAt, bounds.end),
          eq(sleepSessions.status, 'finished'),
        ));

      for (const s of sleeps) {
        if (!s.endedAt || !s.durationSec) continue;
        distributeSleep(
          range, refDate,
          new Date(s.startedAt), new Date(s.endedAt),
          s.durationSec, sleepArr,
        );
      }

      // ── Pañales ─────────────────────────────────────────────────────────────
      const diapers = await db.select().from(timelineEvents)
        .where(and(
          eq(timelineEvents.babyId, babyId),
          eq(timelineEvents.eventTypeId, 'diaper'),
          gte(timelineEvents.timestamp, bounds.start),
          lte(timelineEvents.timestamp, bounds.end),
        ));

      for (const d of diapers) {
        const idx = getBucketIndex(range, refDate, new Date(d.timestamp));
        if (idx >= 0 && idx < n) diaArr[idx]++;
      }

      // ── Growth histórico (todos los puntos del bebé) ─────────────────────
      const growthAll = await db.select().from(growthLogs)
        .where(eq(growthLogs.babyId, babyId))
        .orderBy(desc(growthLogs.timestamp));

      const toGP = (g: typeof growthAll[0]): GrowthPoint => {
        const ts = g.timestamp instanceof Date ? g.timestamp : new Date(Number(g.timestamp));
        return {
          ts:         ts.getTime(),
          label:      ts.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
          weightKg:   g.weightGrams != null ? Math.round(g.weightGrams) / 1000 : null,
          heightCm:   g.heightMm   != null ? Math.round(g.heightMm * 10) / 100 : null,
          headCircCm: g.headCircMm != null ? Math.round(g.headCircMm * 10) / 100 : null,
        };
      };

      // Invertir para orden cronológico
      const growthPts = growthAll.map(toGP).reverse();

      const buckets: ChartBucket[] = defs.map((d, i) => ({
        label:   d.label,
        feeding: feedArr[i],
        sleep:   sleepArr[i],
        diaper:  diaArr[i],
      }));

      return {
        buckets,
        weightHistory: growthPts.filter(g => g.weightKg != null),
        heightHistory: growthPts.filter(g => g.heightCm != null),
        headHistory:   growthPts.filter(g => g.headCircCm != null),
        hasGrowth:     growthPts.length > 0,
      };
    },
  });
}
