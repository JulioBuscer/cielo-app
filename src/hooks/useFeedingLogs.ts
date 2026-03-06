import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { feedingLogs } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { NewFeedingLog } from '@/src/db/schema';
import { generateId } from '@/src/utils/id';

export function useSaveFeedingLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<NewFeedingLog, 'id' | 'babyId' | 'profileId' | 'timestamp'>) => {
      const babyId    = await AsyncStorage.getItem('active_baby_id') ?? '';
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      await db.insert(feedingLogs).values({
        id: generateId(), babyId, profileId, timestamp: new Date(), ...input,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feeding_logs'] }),
  });
}

export function useLastFeedingLog(babyId?: string) {
  return useQuery({
    queryKey: ['feeding_logs', 'last', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      const res = await db.select().from(feedingLogs)
        .where(eq(feedingLogs.babyId, babyId!))
        .orderBy(desc(feedingLogs.timestamp)).limit(1);
      return res[0] ?? null;
    },
  });
}
