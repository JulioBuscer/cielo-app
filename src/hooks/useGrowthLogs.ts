import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { growthLogs, timelineEvents } from '@/src/db/schema';
import { desc, eq, inArray, and } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { getProfileId } from '@/src/utils/storage';
import { onMutationError } from '@/src/utils/mutationError';
import { writeOutbox } from '@/src/sync/outbox';
import { signalPeers } from '@/src/sync/hooks';

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
      photoUris?:  string[];
    }) => {
      const profileId = await getProfileId();
      await getDb().insert(growthLogs).values({
        id:          generateId(),
        babyId:      input.babyId,
        profileId,
        timestamp:   input.timestamp ?? new Date(),
        weightGrams: input.weightKg   != null ? kgToGrams(input.weightKg)  : null,
        heightMm:    input.heightCm   != null ? cmToMm(input.heightCm)     : null,
        headCircMm:  input.headCircCm != null ? cmToMm(input.headCircCm)   : null,
        notes:       input.notes ?? null,
        photoUris:   input.photoUris  ? JSON.stringify(input.photoUris) : null,
        createdAt:   new Date(),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['growth_last', vars.babyId] });
    },
    onError: onMutationError("[useSaveGrowthLog]"),
  });
}

// ─── MUTATION: guardar medición + timeline event en una transacción ───────────
// Resuelve dual-write: si falla el segundo insert, el primero se revierte.
export function useSaveMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId:      string;
      weightKg?:   number;
      heightCm?:   number;
      headCircCm?: number;
      notes?:      string;
      timestamp?:  Date;
      photoUris?:  string[];
    }) => {
      const profileId = await getProfileId();
      const now = input.timestamp ?? new Date();
      const db = getDb();
      let timelineEventId = '';

      await db.transaction(async (tx) => {
        await tx.insert(growthLogs).values({
          id:          generateId(),
          babyId:      input.babyId,
          profileId,
          timestamp:   now,
          weightGrams: input.weightKg   != null ? kgToGrams(input.weightKg)  : null,
          heightMm:    input.heightCm   != null ? cmToMm(input.heightCm)     : null,
          headCircMm:  input.headCircCm != null ? cmToMm(input.headCircCm)   : null,
          notes:       input.notes ?? null,
          photoUris:   input.photoUris  ? JSON.stringify(input.photoUris) : null,
          createdAt:   new Date(),
        });

        const hasPhotos = (input.photoUris?.length ?? 0) > 0;
        timelineEventId = generateId();
        await tx.insert(timelineEvents).values({
          id:          timelineEventId,
          babyId:      input.babyId,
          profileId,
          eventTypeId: 'measurement',
          timestamp:   now,
          notes:       input.notes ?? null,
          values: JSON.stringify({
            weightKg:   input.weightKg,
            heightCm:   input.heightCm,
            headCircCm: input.headCircCm,
            photoUris:  hasPhotos ? input.photoUris : undefined,
          }),
          createdAt: new Date(),
        });
      });

      await writeOutbox('timeline_events', timelineEventId, 'insert', {
        id: timelineEventId, babyId: input.babyId, profileId,
        eventTypeId: 'measurement', timestamp: now,
        notes: input.notes, values: { weightKg: input.weightKg, heightCm: input.heightCm, headCircCm: input.headCircCm },
      });
      await signalPeers();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['growth_last', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['timeline', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['calendar', vars.babyId], refetchType: 'all' });
    },
    onError: onMutationError("[useSaveMeasurement]"),
  });
}

// ─── MUTATION: actualizar registro de crecimiento ────────────────────────────
export function useUpdateGrowthLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id:          string;
      babyId:      string;
      weightKg?:   number;
      heightCm?:   number;
      headCircCm?: number;
      notes?:      string;
      timestamp?:  Date;
      photoUris?:  string[];
    }) => {
      await getDb().update(growthLogs)
        .set({
          timestamp:   input.timestamp,
          weightGrams: input.weightKg   != null ? kgToGrams(input.weightKg)  : null,
          heightMm:    input.heightCm   != null ? cmToMm(input.heightCm)     : null,
          headCircMm:  input.headCircCm != null ? cmToMm(input.headCircCm)   : null,
          notes:       input.notes ?? null,
          photoUris:   input.photoUris  ? JSON.stringify(input.photoUris) : null,
        })
        .where(eq(growthLogs.id, input.id));
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['growth_last', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId, 'history'] });
    },
    onError: onMutationError("[useUpdateGrowthLog]"),
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
      const glRows: any[] = (await db
        .select()
        .from(growthLogs)
        .where(eq(growthLogs.babyId, babyId))
        .orderBy(desc(growthLogs.timestamp))).map((r: any) => ({
          ...r,
          photoUris: r.photoUris ? (() => { try { return JSON.parse(r.photoUris); } catch { return null; } })() : null,
          source: "growth_logs",
        }));

      // Fuente 2: timeline_events tipo 'weight', 'height', o 'measurement'
      const evRows = await db
        .select()
        .from(timelineEvents)
        .where(and(
          eq(timelineEvents.babyId, babyId),
          inArray(timelineEvents.eventTypeId, ['weight', 'height', 'measurement']),
        ))
        .orderBy(desc(timelineEvents.timestamp));

      const parseMeta = (row: typeof evRows[0]): Record<string, any> => {
        try { return row.metadata ? JSON.parse(row.metadata) : {}; }
        catch { return {}; }
      };

      const parseValues = (row: typeof evRows[0]): Record<string, any> => {
        try { return row.values ? JSON.parse(row.values) : {}; }
        catch { return {}; }
      };

      // Convertir timeline_events a filas unificadas
      const evUnified = evRows.map((e) => {
        const meta = parseMeta(e);
        const vals = parseValues(e);
        const ts = e.timestamp instanceof Date ? e.timestamp : new Date(Number(e.timestamp));

        if (e.eventTypeId === 'measurement') {
          return {
            id: e.id,
            babyId: e.babyId,
            profileId: e.profileId,
            timestamp: ts,
            weightGrams: vals.weightKg != null ? vals.weightKg * 1000 : null,
            heightMm: vals.heightCm != null ? vals.heightCm * 10 : null,
            headCircMm: vals.headCircCm != null ? vals.headCircCm * 10 : null,
            notes: e.notes,
            photoUris: vals.photoUris ?? null,
            createdAt: e.createdAt instanceof Date ? e.createdAt : new Date(Number(e.createdAt)),
            source: "timeline",
          };
        }

        let weightGrams: number | null = null;
        let heightMm: number | null = null;

        if (e.eventTypeId === 'weight') {
          if (vals.weight != null) weightGrams = vals.weight * 1000;
          else if (meta.weightGrams != null) weightGrams = meta.weightGrams;
        } else if (e.eventTypeId === 'height') {
          if (vals.height != null) heightMm = vals.height * 10;
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
          source: "timeline",
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

      // ── Fuente 2: timeline_events de tipo 'weight', 'height', o 'measurement' ─
      const evRows = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.babyId, babyId))
        .orderBy(desc(timelineEvents.timestamp));

      const weightEvents = evRows.filter(e => e.eventTypeId === 'weight');
      const heightEvents = evRows.filter(e => e.eventTypeId === 'height');
      const measurementEvents = evRows.filter(e => e.eventTypeId === 'measurement');

      const parseMeta = (row: typeof evRows[0]): Record<string, any> => {
        try { return row.metadata ? JSON.parse(row.metadata) : {}; }
        catch { return {}; }
      };

      const parseValues = (row: typeof evRows[0]): Record<string, any> => {
        try { return row.values ? JSON.parse(row.values) : {}; }
        catch { return {}; }
      };

      // ── Mejor fuente para weightGrams ────────────────────────────────────
      const glWeight = glRows.find(g => g.weightGrams != null);
      const evWeightMeta = weightEvents.find(e => parseMeta(e).weightGrams != null);
      const evWeightVal = weightEvents.find(e => parseValues(e).weight != null);
      const evMeasurementW = measurementEvents.find(e => parseValues(e).weightKg != null);

      let weightGrams: number | null = null;
      let weightTs:    number | null = null;

      const weightCandidates: { value: number; ts: number }[] = [];
      if (glWeight) weightCandidates.push({ value: glWeight.weightGrams!, ts: new Date(glWeight.timestamp).getTime() });
      if (evWeightMeta) weightCandidates.push({ value: parseMeta(evWeightMeta).weightGrams, ts: new Date(evWeightMeta.timestamp).getTime() });
      if (evWeightVal) weightCandidates.push({ value: parseValues(evWeightVal).weight * 1000, ts: new Date(evWeightVal.timestamp).getTime() });
      if (evMeasurementW) weightCandidates.push({ value: parseValues(evMeasurementW).weightKg * 1000, ts: new Date(evMeasurementW.timestamp).getTime() });
      const bestWeight = weightCandidates.sort((a, b) => b.ts - a.ts)[0];
      if (bestWeight) { weightGrams = bestWeight.value; weightTs = bestWeight.ts; }

      // ── Mejor fuente para heightMm ───────────────────────────────────────
      const glHeight = glRows.find(g => g.heightMm != null);
      const evHeightMeta = heightEvents.find(e => parseMeta(e).heightMm != null);
      const evHeightVal = heightEvents.find(e => parseValues(e).height != null);
      const evMeasurementH = measurementEvents.find(e => parseValues(e).heightCm != null);

      let heightMm: number | null = null;
      let heightTs: number | null = null;

      const heightCandidates: { value: number; ts: number }[] = [];
      if (glHeight) heightCandidates.push({ value: glHeight.heightMm!, ts: new Date(glHeight.timestamp).getTime() });
      if (evHeightMeta) heightCandidates.push({ value: parseMeta(evHeightMeta).heightMm, ts: new Date(evHeightMeta.timestamp).getTime() });
      if (evHeightVal) heightCandidates.push({ value: parseValues(evHeightVal).height * 10, ts: new Date(evHeightVal.timestamp).getTime() });
      if (evMeasurementH) heightCandidates.push({ value: parseValues(evMeasurementH).heightCm * 10, ts: new Date(evMeasurementH.timestamp).getTime() });
      const bestHeight = heightCandidates.sort((a, b) => b.ts - a.ts)[0];
      if (bestHeight) { heightMm = bestHeight.value; heightTs = bestHeight.ts; }

      // ── headCircMm — growth_logs + measurement events ────────────────────
      const glHead = glRows.find(g => g.headCircMm != null);
      const evHead = measurementEvents.find(e => parseValues(e).headCircCm != null);

      let headCircMm: number | null = null;
      let headTs: number | null = null;

      const headCandidates: { value: number; ts: number }[] = [];
      if (glHead) headCandidates.push({ value: glHead.headCircMm!, ts: new Date(glHead.timestamp).getTime() });
      if (evHead) headCandidates.push({ value: parseValues(evHead).headCircCm * 10, ts: new Date(evHead.timestamp).getTime() });
      const bestHead = headCandidates.sort((a, b) => b.ts - a.ts)[0];
      if (bestHead) { headCircMm = bestHead.value; headTs = bestHead.ts; }

      if (weightGrams == null && heightMm == null && headCircMm == null) {
        return null;
      }

      return { weightGrams, heightMm, headCircMm, weightTs, heightTs, headTs };
    },
  });
}
