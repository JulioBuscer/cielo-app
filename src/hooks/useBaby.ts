import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { babies } from '@/src/db/schema';
import { eq, desc, isNull, ne, and } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { onMutationError } from '@/src/utils/mutationError';
import { writeOutbox } from '@/src/sync/outbox';
import { signalPeers } from '@/src/sync/hooks';
import { getCachedDeviceId } from '@/src/sync/device';
import { useActiveBabyCtx } from './ActiveBabyProvider';
import type { Baby } from '@/src/db/schema';

export function useCreateBaby() {
  const qc = useQueryClient();
  const { setActiveBabyId } = useActiveBabyCtx();
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
      await writeOutbox('babies', id, 'insert', { id, ...input });
      await signalPeers();
      setActiveBabyId(id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baby'] });
      qc.invalidateQueries({ queryKey: ['babies'] });
    },
    onError: onMutationError("[useCreateBaby]"),
  });
}

export function useActiveBaby() {
  const { activeBabyId } = useActiveBabyCtx();
  return useQuery({
    queryKey: ['baby', activeBabyId],
    queryFn: async () => {
      if (!activeBabyId) return null;
      const res = await getDb().select().from(babies).where(eq(babies.id, activeBabyId));
      return res[0] ?? null;
    },
  });
}

export function useBabies() {
  return useQuery({
    queryKey: ['babies'],
    queryFn: () => getDb().select().from(babies)
      .where(isNull(babies.deletedAt))
      .orderBy(desc(babies.createdAt)),
  });
}

export function useBaby(babyId?: string) {
  return useQuery({
    queryKey: ['baby', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      if (!babyId) return null;
      const res = await getDb().select().from(babies).where(eq(babies.id, babyId));
      return res[0] ?? null;
    },
  });
}

export function useSetActiveBaby() {
  const { setActiveBabyId } = useActiveBabyCtx();
  return useMutation({
    mutationFn: async (id: string) => {
      setActiveBabyId(id);
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
      await writeOutbox('babies', input.id, 'update', { ...input, updatedAt: Date.now() });
      await signalPeers();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby'] }),
    onError: onMutationError("[useUpdateBaby]"),
  });
}

export function useDeleteBaby() {
  const qc = useQueryClient();
  const { activeBabyId, setActiveBabyId } = useActiveBabyCtx();
  return useMutation({
    mutationFn: async (id: string) => {
      if (activeBabyId === id) {
        const others = await getDb().select({ id: babies.id })
          .from(babies)
          .where(and(ne(babies.id, id), isNull(babies.deletedAt)))
          .limit(1);
        if (others.length > 0) setActiveBabyId(others[0].id);
        else setActiveBabyId(null);
      }
      await getDb().delete(babies).where(eq(babies.id, id));
      await writeOutbox('babies', id, 'delete', { id });
      await signalPeers();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baby'] });
      qc.invalidateQueries({ queryKey: ['babies'] });
    },
    onError: onMutationError("[useDeleteBaby]"),
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
