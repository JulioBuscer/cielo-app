import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '@/src/db/client';
import { babies } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import type { Baby } from '@/src/db/schema';

export function useCreateBaby() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      birthDate: Date;
      nickname?: string;
      sex?: 'male' | 'female' | 'unknown';
      avatarEmoji?: string;
      photoUri?: string;
    }) => {
      const id  = generateId();
      const now = new Date();
      await getDb().insert(babies).values({
        id,
        name:        input.name,
        nickname:    input.nickname ?? null,
        birthDate:   input.birthDate,
        sex:         input.sex ?? 'unknown',
        status:      'unknown',
        avatarEmoji: input.avatarEmoji ?? '👶',
        photoUri:    input.photoUri ?? null,
        createdAt:   now,
        updatedAt:   now,
      } as any);
      await AsyncStorage.setItem('active_baby_id', id);
      await AsyncStorage.setItem('onboarding_done', 'true');
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby'] }),
  });
}

export function useActiveBaby() {
  return useQuery({
    queryKey: ['baby'],
    queryFn: async () => {
      const id = await AsyncStorage.getItem('active_baby_id');
      if (!id) return null;
      const res = await getDb().select().from(babies).where(eq(babies.id, id));
      return res[0] ?? null;
    },
  });
}

export function useUpdateBaby() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Baby> & { id: string }) => {
      await getDb().update(babies)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(babies.id, input.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby'] }),
  });
}

// ─── HELPERS DE EDAD ──────────────────────────────────────────────────────────

export function calcAge(birthDate: Date | string | number): {
  days: number; months: number; years: number; label: string;
} {
  const birth = new Date(birthDate);
  const now   = new Date();

  let years  = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth()    - birth.getMonth();
  let days   = now.getDate()     - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000);

  let label: string;
  if (totalDays < 7) {
    label = `${totalDays} ${totalDays === 1 ? 'día' : 'días'}`;
  } else if (totalDays < 30) {
    const weeks = Math.floor(totalDays / 7);
    label = `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else if (years === 0) {
    label = `${months} ${months === 1 ? 'mes' : 'meses'}`;
  } else {
    label = `${years} ${years === 1 ? 'año' : 'años'}${months > 0 ? ` y ${months} ${months === 1 ? 'mes' : 'meses'}` : ''}`;
  }

  return { days: totalDays, months, years, label };
}

export const SEX_LABELS = {
  male:    { emoji: '👦', label: 'Niño' },
  female:  { emoji: '👧', label: 'Niña' },
  unknown: { emoji: '👶', label: 'No especificado' },
} as const;

export const STATUS_LABELS = {
  healthy: { emoji: '💚', label: 'Sanito/a' },
  sick:    { emoji: '🤒', label: 'Enfermito/a' },
  unknown: { emoji: '🤷', label: 'No sé jeje' },
} as const;
