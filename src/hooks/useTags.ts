import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { tags } from '@/src/db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { generateId } from '@/src/utils/id';
import { onMutationError } from '@/src/utils/mutationError';

export function useTags(babyId?: string) {
  return useQuery({
    queryKey: ['tags', babyId],
    queryFn: async () => {
      const q = getDb().select().from(tags).orderBy(desc(tags.usageCount));
      if (babyId) return q.where(eq(tags.babyId, babyId));
      return q;
    },
    enabled: !!babyId,
  });
}

export function useSearchTags(babyId: string, query: string) {
  return useQuery({
    queryKey: ['tags', 'search', babyId, query],
    queryFn: async () => {
      const q = getDb().select().from(tags)
        .where(and(eq(tags.babyId, babyId)))
        .orderBy(desc(tags.usageCount));
      // Filter in-memory for LIKE support (expo-sqlite limitation)
      const all = await q;
      const lower = query.toLowerCase();
      return all.filter((t) => t.name.toLowerCase().includes(lower)).slice(0, 10);
    },
    enabled: !!babyId && query.length > 0,
  });
}

export function useSaveTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { babyId: string; tagNames: string[] }) => {
      const existing = await getDb().select().from(tags)
        .where(and(eq(tags.babyId, input.babyId), inArray(tags.name, input.tagNames)));
      const existingNames = new Set(existing.map((t) => t.name));
      const now = new Date();

      // Upsert existing: increment usage_count
      for (const t of existing) {
        await getDb().update(tags).set({ usageCount: (t.usageCount ?? 0) + 1 }).where(eq(tags.id, t.id));
      }

      // Insert new
      const newNames = input.tagNames.filter((n) => !existingNames.has(n));
      for (const name of newNames) {
        await getDb().insert(tags).values({
          id: generateId(),
          babyId: input.babyId,
          name,
          usageCount: 1,
          createdAt: now,
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tags', vars.babyId] });
    },
    onError: onMutationError("[useSaveTags]"),
  });
}
