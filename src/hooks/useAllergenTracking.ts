import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { foodLogs, foodCatalog } from '@/src/db/schema';
import { inArray } from 'drizzle-orm';

export interface AllergenInfo {
  id: string;
  label: string;
  emoji: string;
  status: 'introduced' | 'reaction' | 'pending';
  foods: { id: string; name: string; emoji: string | null }[];
  logs: { id: string; timestamp: Date; isFirst: boolean | null; reaction: string | null; notes: string | null }[];
  firstIntroduced: Date | null;
}

const ALLERGENS = [
  { id: 'egg',        label: 'Huevo',      emoji: '🥚' },
  { id: 'milk',       label: 'Leche',      emoji: '🥛' },
  { id: 'peanut',     label: 'Cacahuate',  emoji: '🥜' },
  { id: 'tree_nuts',  label: 'Frutos secos', emoji: '🌰' },
  { id: 'fish',       label: 'Pescado',    emoji: '🐟' },
  { id: 'shellfish',  label: 'Mariscos',   emoji: '🦐' },
  { id: 'wheat',      label: 'Trigo',      emoji: '🌾' },
  { id: 'soy',        label: 'Soya',       emoji: '🫘' },
];

export function useAllergenTracking(babyId?: string) {
  return useQuery({
    queryKey: ['allergens', babyId],
    enabled: !!babyId,
    queryFn: async (): Promise<AllergenInfo[]> => {
      if (!babyId) return [];

      const db = getDb();
      const allFoods = await db.select().from(foodCatalog);

      const foodsWithAllergens = allFoods.filter(
        (f: any) => f.allergens != null && f.allergens !== ''
      );

      const allergenicFoodIds = foodsWithAllergens.map((f: any) => f.id);
      const logs = allergenicFoodIds.length > 0
        ? await db
            .select()
            .from(foodLogs)
            .where(
              inArray(foodLogs.foodId, allergenicFoodIds as [string, ...string[]])
            )
        : [];

      return ALLERGENS.map((a) => {
        const matchingFoods = foodsWithAllergens.filter((f: any) =>
          f.allergens.split(',').map((s: string) => s.trim()).includes(a.id)
        );
        const matchingLogs = logs.filter((l: any) =>
          matchingFoods.some((f: any) => f.id === l.foodId)
        );
        const hasReaction = matchingLogs.some((l: any) => l.reaction != null && l.reaction !== '');
        const sorted = matchingLogs.sort(
          (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return {
          id: a.id,
          label: a.label,
          emoji: a.emoji,
          status: matchingLogs.length === 0
            ? 'pending' as const
            : hasReaction
              ? 'reaction' as const
              : 'introduced' as const,
          foods: matchingFoods.map((f: any) => ({
            id: f.id,
            name: f.name,
            emoji: f.emoji,
          })),
          logs: sorted.map((l: any) => ({
            id: l.id,
            timestamp: l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp),
            isFirst: l.isFirst,
            reaction: l.reaction,
            notes: l.notes,
          })),
          firstIntroduced: sorted.length > 0
            ? (sorted[sorted.length - 1].timestamp instanceof Date
                ? sorted[sorted.length - 1].timestamp
                : new Date(sorted[sorted.length - 1].timestamp))
            : null,
        };
      });
    },
  });
}
