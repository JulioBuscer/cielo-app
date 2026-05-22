import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '@/src/db/client';
import { growthLogs, timelineEvents } from '@/src/db/schema';
import { desc, eq, inArray, and } from 'drizzle-orm';
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

// ─── QUERY: historial completo (growth_logs + timeline_events) ─────────────────
//
// El usuario puede registrar peso/talla de dos formas:
//   1. app/logs/growth/new.tsx → guarda en growth_logs
//   2. Quick Event → "Peso" / "Estatura" → guarda en timeline_events
//
// Este hook fusiona ambas fuentes ordenadas por timestamp.
// ─────────────────────────────────────────────────────────────────────────────
export function useGrowthHistory(babyId?: string) {
  return useQuery({
    queryKey: ['growth_logs', babyId, 'history'],
    enabled:  !!babyId,
    queryFn: async () => {
      if (!babyId) return [];

      const db = getDb();

      // Fuente 1: growth_logs
      const glRows = await db
        .select()
        .from(growthLogs)
        .where(eq(growthLogs.babyId, babyId))
        .orderBy(desc(growthLogs.timestamp));

      // Fuente 2: timeline_events tipo 'weight' o 'height'
      const evRows = await db
        .select()
        .from(timelineEvents)
        .where(and(
          eq(timelineEvents.babyId, babyId),
          inArray(timelineEvents.eventTypeId, ['weight', 'height']),
        ))
        .orderBy(desc(timelineEvents.timestamp));

      const parseMeta = (row: typeof evRows[0]): Record<string, any> => {
        try { return row.metadata ? JSON.parse(row.metadata) : {}; }
        catch { return {}; }
      };

      const parseValues = (row: typeof evRows[0]): Record<string, number> => {
        try { return row.values ? JSON.parse(row.values) : {}; }
        catch { return {}; }
      };

      // Convertir timeline_events a filas unificadas
      const evUnified = evRows.map((e) => {
        const meta = parseMeta(e);
        const vals = parseValues(e);
        const ts = e.timestamp instanceof Date ? e.timestamp : new Date(Number(e.timestamp));
        let weightGrams: number | null = null;
        let heightMm: number | null = null;

        if (e.eventTypeId === 'weight') {
          // Nuevo sistema: values.weight está en kg → convertir a gramos
          if (vals.weight != null) weightGrams = vals.weight * 1000;
          // Legacy: metadata.weightGrams ya está en gramos
          else if (meta.weightGrams != null) weightGrams = meta.weightGrams;
        } else if (e.eventTypeId === 'height') {
          // Nuevo sistema: values.height está en cm → convertir a mm
          if (vals.height != null) heightMm = vals.height * 10;
          // Legacy: metadata.heightMm ya está en mm
          else if (meta.heightMm != null) heightMm = meta.heightMm;
        }

        return {
          id: e.id,
          babyId: e.babyId,
          profileId: e.profileId,
          timestamp: ts,
          weightGrams,
          heightMm,
          headCircMm: null as number | null,
          notes: e.notes,
          createdAt: e.createdAt instanceof Date ? e.createdAt : new Date(Number(e.createdAt)),
        };
      });

      // Fusionar y ordenar por timestamp (más reciente primero)
      const merged = [...glRows, ...evUnified].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      return merged;
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

      // Helper: extraer valor desde la nueva columna "values" (JSON)
      const parseValues = (row: typeof evRows[0]): Record<string, number> => {
        try { return row.values ? JSON.parse(row.values) : {}; }
        catch { return {}; }
      };

      // ── Mejor fuente para weightGrams ────────────────────────────────────
      // Candidatos de growth_logs
      const glWeight = glRows.find(g => g.weightGrams != null);
      // Candidatos de timeline_events: metadata.weightGrams (legacy, en gramos)
      const evWeightMeta = weightEvents.find(e => parseMeta(e).weightGrams != null);
      // Candidatos de timeline_events: "values" (nuevo sistema, en kg → convertir a gramos)
      const evWeightVal = weightEvents.find(e => parseValues(e).weight != null);

      let weightGrams: number | null = null;
      let weightTs:    number | null = null;

      // Tomar el más reciente entre las tres fuentes
      const weightCandidates: { value: number; ts: number }[] = [];
      if (glWeight) weightCandidates.push({ value: glWeight.weightGrams!, ts: new Date(glWeight.timestamp).getTime() });
      if (evWeightMeta) weightCandidates.push({ value: parseMeta(evWeightMeta).weightGrams, ts: new Date(evWeightMeta.timestamp).getTime() });
      if (evWeightVal) weightCandidates.push({ value: parseValues(evWeightVal).weight * 1000, ts: new Date(evWeightVal.timestamp).getTime() });
      const bestWeight = weightCandidates.sort((a, b) => b.ts - a.ts)[0];
      if (bestWeight) { weightGrams = bestWeight.value; weightTs = bestWeight.ts; }

      // ── Mejor fuente para heightMm ───────────────────────────────────────
      const glHeight = glRows.find(g => g.heightMm != null);
      const evHeightMeta = heightEvents.find(e => parseMeta(e).heightMm != null);
      const evHeightVal = heightEvents.find(e => parseValues(e).height != null);

      let heightMm: number | null = null;
      let heightTs: number | null = null;

      const heightCandidates: { value: number; ts: number }[] = [];
      if (glHeight) heightCandidates.push({ value: glHeight.heightMm!, ts: new Date(glHeight.timestamp).getTime() });
      if (evHeightMeta) heightCandidates.push({ value: parseMeta(evHeightMeta).heightMm, ts: new Date(evHeightMeta.timestamp).getTime() });
      if (evHeightVal) heightCandidates.push({ value: parseValues(evHeightVal).height * 10, ts: new Date(evHeightVal.timestamp).getTime() });
      const bestHeight = heightCandidates.sort((a, b) => b.ts - a.ts)[0];
      if (bestHeight) { heightMm = bestHeight.value; heightTs = bestHeight.ts; }

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
