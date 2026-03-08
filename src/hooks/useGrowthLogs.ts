import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '@/src/db/client';
import { growthLogs } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';

// ─── Helpers de conversión (UI en kg/cm, DB en g/mm) ─────────────────────────
export const kgToGrams  = (kg: number)  => Math.round(kg * 1000);
export const gramsToKg  = (g: number)   => (g / 1000).toFixed(3);
export const cmToMm     = (cm: number)  => Math.round(cm * 10);
export const mmToCm     = (mm: number)  => (mm / 10).toFixed(1);

// ─── MUTATION: guardar registro de crecimiento ────────────────────────────────
export function useSaveGrowthLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId:     string;
      weightKg?:  number;
      heightCm?:  number;
      headCircCm?: number;
      notes?:     string;
      timestamp?: Date;
    }) => {
      const profileId = (await AsyncStorage.getItem('active_profile_id')) ?? '';
      await getDb().insert(growthLogs).values({
        id:          generateId(),
        babyId:      input.babyId,
        profileId,
        timestamp:   input.timestamp ?? new Date(),
        weightGrams: input.weightKg  != null ? kgToGrams(input.weightKg)  : null,
        heightMm:    input.heightCm  != null ? cmToMm(input.heightCm)     : null,
        headCircMm:  input.headCircCm != null ? cmToMm(input.headCircCm)  : null,
        notes:       input.notes ?? null,
        createdAt:   new Date(),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['growth_logs', vars.babyId] });
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

// ─── QUERY: último registro ───────────────────────────────────────────────────
export function useLastGrowthLog(babyId?: string) {
  return useQuery({
    queryKey: ['growth_logs', babyId, 'last'],
    enabled:  !!babyId,
    queryFn: async () => {
      if (!babyId) return null;
      const res = await getDb()
        .select()
        .from(growthLogs)
        .where(eq(growthLogs.babyId, babyId))
        .orderBy(desc(growthLogs.timestamp))
        .limit(1);
      return res[0] ?? null;
    },
  });
}
