import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { growthLogs } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';

// Helpers de conversión — la UI trabaja en kg/cm, la DB en g/mm
export const kgToGrams = (kg: number) => Math.round(kg * 1000);
export const gramsToKg = (g: number) => (g / 1000).toFixed(2);
export const cmToMm = (cm: number) => Math.round(cm * 10);
export const mmToCm = (mm: number) => (mm / 10).toFixed(1);

export function useSaveGrowthLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      weightKg?: number;   // Opcional: puede medir solo estatura
      heightCm?: number;   // Opcional: puede pesar solo
      headCircCm?: number; // Opcional: circunferencia cefálica
      notes?: string;
    }) => {
      const babyId    = await AsyncStorage.getItem('active_baby_id') ?? '';
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      await db.insert(growthLogs).values({
        id:           generateId(),
        babyId, profileId,
        timestamp:    new Date(),
        weightGrams:  input.weightKg != null ? kgToGrams(input.weightKg) : null,
        heightMm:     input.heightCm != null ? cmToMm(input.heightCm) : null,
        headCircMm:   input.headCircCm != null ? cmToMm(input.headCircCm) : null,
        notes:        input.notes ?? null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth_logs'] }),
  });
}

export function useGrowthHistory(babyId?: string) {
  return useQuery({
    queryKey: ['growth_logs', 'history', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      return db.select().from(growthLogs)
        .where(eq(growthLogs.babyId, babyId!))
        .orderBy(desc(growthLogs.timestamp));
    },
  });
}

export function useLastGrowthLog(babyId?: string) {
  return useQuery({
    queryKey: ['growth_logs', 'last', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      const res = await db.select().from(growthLogs)
        .where(eq(growthLogs.babyId, babyId!))
        .orderBy(desc(growthLogs.timestamp))
        .limit(1);
      return res[0] ?? null;
    },
  });
}
