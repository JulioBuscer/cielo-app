import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { babies } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';

export function useCreateBaby() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; birthDate: Date }) => {
      const id = generateId();
      await db.insert(babies).values({
        id, name: input.name, birthDate: input.birthDate, createdAt: new Date(),
      });
      await AsyncStorage.setItem('active_baby_id', id);
      await AsyncStorage.setItem('onboarding_done', 'true'); // ← Aquí, al final
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
      const res = await db.select().from(babies).where(eq(babies.id, id));
      return res[0] ?? null;
    },
  });
}
