import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { diaperLogs } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { NewDiaperLog } from '@/src/db/schema';
import { generateId } from '@/src/utils/id';

export function useSaveDiaperLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<NewDiaperLog, 'id' | 'babyId' | 'profileId' | 'timestamp'>) => {
      const babyId    = await AsyncStorage.getItem('active_baby_id') ?? '';
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      await db.insert(diaperLogs).values({
        id: generateId(), babyId, profileId, timestamp: new Date(), ...input,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diaper_logs'] }),
  });
}

export function useLastDiaperLog(babyId?: string) {
  return useQuery({
    queryKey: ['diaper_logs', 'last', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      const res = await db.select().from(diaperLogs)
        .where(eq(diaperLogs.babyId, babyId!))
        .orderBy(desc(diaperLogs.timestamp)).limit(1);
      return res[0] ?? null;
    },
  });
}
