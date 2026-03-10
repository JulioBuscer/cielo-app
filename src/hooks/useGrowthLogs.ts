import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '@/src/db/client';
import { growthLogs, timelineEvents } from '@/src/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';

// ─── Helpers de conversión (UI en kg/cm, DB en g/mm) ─────────────────────────
export const kgToGrams  = (kg: number)  => Math.round(kg * 1000);
export const gramsToKg  = (g: number)   => (g / 1000).toFixed(3);
export const cmToMm     = (cm: number)  => Math.round(cm * 10);
export const mmToCm     = (mm: number)  => (mm / 10).toFixed(1);

// ─── Tipo unificado que devuelven los hooks ───────────────────────────────────
export interface LatestGrowth {
  weightGrams: number | null;
  heightMm:    number | null;
  headCircMm:  number | null;
  // ts de cada medición por separado (pueden venir de fuentes distintas)
  weightTs:    number | null;
  heightTs:    number | null;
  headTs:      number | null;
}

// ─── MUTATION: guardar registro de crecimiento ────────────────────────────────
export function useSaveGrowthLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId:      string;
      weightKg?:   number;
      heightCm?:   number;
      headCircCm?: number;
      notes?:      string;
      timestamp?:  Date;
    }) => {
      const profileId = (await AsyncStorage.getItem('active_profile_id')) ?? '';
      await getDb().insert(growthLogs).values({
        id:          generateId(),
        babyId:      input.babyId,
        profileId,
        timestamp:   input.timestamp ?? new Date(),
        weightGrams: input.weightKg   != null ? kgToGrams(input.weightKg)  : null,
        heightMm:    input.heightCm   != null ? cmToMm(input.heightCm)     : null,
        headCircMm:  input.headCircCm != null ? cmToMm(input.headCircCm)   : null,
        notes:       input.notes ?? null,
        createdAt:   new Date(),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['growth_last', vars.babyId] });
    },
  });
}

// ─── QUERY: historial completo ────────────────────────────────────────────────
export function useGrowthHistory(babyId?: string) {
  return useQuery({
    queryKey: ['growth_logs', babyId, 'history'],
    enabled:  !!babyId,
    queryFn: async () => {
      if (!babyId) return [];
      return getDb()
        .select()
        .from(growthLogs)
        .where(eq(growthLogs.babyId, babyId))
        .orderBy(desc(growthLogs.timestamp));
    },
  });
}

// ─── QUERY: último registro — fusiona growth_logs + timeline_events ───────────
//
// El usuario puede registrar peso/talla de dos formas:
//   1. app/logs/growth/new.tsx  → guarda en growth_logs
//   2. Botón ➕ Evento → tipo "Peso"/"Estatura" → guarda en timeline_events
//      con metadata: { weightGrams: N } o { heightMm: N }
//
// Este hook consulta ambas fuentes y devuelve el valor más reciente
// de cada medición, independientemente de dónde fue guardada.
// ─────────────────────────────────────────────────────────────────────────────
export function useLastGrowthLog(babyId?: string) {
  return useQuery({
    queryKey: ['growth_last', babyId],
    enabled:  !!babyId,
    queryFn: async (): Promise<LatestGrowth | null> => {
      if (!babyId) return null;
      const db = getDb();

      // ── Fuente 1: tabla growth_logs ──────────────────────────────────────
      const glRows = await db
        .select()
        .from(growthLogs)
        .where(eq(growthLogs.babyId, babyId))
        .orderBy(desc(growthLogs.timestamp));

      // ── Fuente 2: timeline_events de tipo 'weight' o 'height' ────────────
      const evRows = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.babyId, babyId))
        .orderBy(desc(timelineEvents.timestamp));

      const weightEvents = evRows.filter(e => e.eventTypeId === 'weight');
      const heightEvents = evRows.filter(e => e.eventTypeId === 'height');

      // Helper: parsear metadata de timeline_event
      const parseMeta = (row: typeof evRows[0]): Record<string, any> => {
        try { return row.metadata ? JSON.parse(row.metadata) : {}; }
        catch { return {}; }
      };

      // ── Mejor fuente para weightGrams ────────────────────────────────────
      // Candidatos de growth_logs
      const glWeight = glRows.find(g => g.weightGrams != null);
      // Candidatos de timeline_events
      const evWeight = weightEvents.find(e => parseMeta(e).weightGrams != null);

      let weightGrams: number | null = null;
      let weightTs:    number | null = null;

      if (glWeight && evWeight) {
        const glTs = new Date(glWeight.timestamp).getTime();
        const evTs = new Date(evWeight.timestamp).getTime();
        if (glTs >= evTs) {
          weightGrams = glWeight.weightGrams;
          weightTs    = glTs;
        } else {
          weightGrams = parseMeta(evWeight).weightGrams;
          weightTs    = evTs;
        }
      } else if (glWeight) {
        weightGrams = glWeight.weightGrams;
        weightTs    = new Date(glWeight.timestamp).getTime();
      } else if (evWeight) {
        weightGrams = parseMeta(evWeight).weightGrams;
        weightTs    = new Date(evWeight.timestamp).getTime();
      }

      // ── Mejor fuente para heightMm ───────────────────────────────────────
      const glHeight = glRows.find(g => g.heightMm != null);
      const evHeight = heightEvents.find(e => parseMeta(e).heightMm != null);

      let heightMm: number | null = null;
      let heightTs: number | null = null;

      if (glHeight && evHeight) {
        const glTs = new Date(glHeight.timestamp).getTime();
        const evTs = new Date(evHeight.timestamp).getTime();
        if (glTs >= evTs) {
          heightMm = glHeight.heightMm;
          heightTs = glTs;
        } else {
          heightMm = parseMeta(evHeight).heightMm;
          heightTs = evTs;
        }
      } else if (glHeight) {
        heightMm = glHeight.heightMm;
        heightTs = new Date(glHeight.timestamp).getTime();
      } else if (evHeight) {
        heightMm = parseMeta(evHeight).heightMm;
        heightTs = new Date(evHeight.timestamp).getTime();
      }

      // ── headCircMm — solo viene de growth_logs (no hay evento de tipo head) ─
      const glHead = glRows.find(g => g.headCircMm != null);
      const headCircMm = glHead?.headCircMm ?? null;
      const headTs     = glHead ? new Date(glHead.timestamp).getTime() : null;

      // Si no hay nada en ninguna fuente, retornar null
      if (weightGrams == null && heightMm == null && headCircMm == null) {
        return null;
      }

      return { weightGrams, heightMm, headCircMm, weightTs, heightTs, headTs };
    },
  });
}
