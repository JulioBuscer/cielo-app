import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { eq, desc, asc, and, gte, lte } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { foodCatalog, foodLogs } from "@/src/db/schema";
import { generateId } from "@/src/utils/id";

export function useFoodCatalog() {
  return useQuery({
    queryKey: ["food_catalog"],
    queryFn: () => getDb()
      .select()
      .from(foodCatalog)
      .where(eq(foodCatalog.hidden, false as any))
      .orderBy(foodCatalog.name),
  });
}

export function useFoodCatalogAll() {
  return useQuery({
    queryKey: ["food_catalog_all"],
    queryFn: () => getDb()
      .select()
      .from(foodCatalog)
      .orderBy(foodCatalog.name),
  });
}

export function useFoodLogs(babyId?: string, limit = 50) {
  return useQuery({
    queryKey: ["food_logs", babyId],
    enabled: !!babyId,
    queryFn: async () => {
      if (!babyId) return [];
      return getDb()
        .select()
        .from(foodLogs)
        .where(eq(foodLogs.babyId, babyId))
        .orderBy(desc(foodLogs.timestamp))
        .limit(limit);
    },
  });
}

export function useSaveFoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      babyId: string;
      foodId: string;
      timestamp: Date;
      isFirst?: boolean;
      reaction?: string;
      photoUri?: string;
      notes?: string;
    }) => {
      const profileId = (await AsyncStorage.getItem("active_profile_id")) ?? "";
      await getDb().insert(foodLogs).values({
        id: generateId(),
        babyId: input.babyId,
        profileId,
        foodId: input.foodId,
        timestamp: input.timestamp,
        isFirst: input.isFirst ?? false,
        reaction: input.reaction ?? null,
        photoUri: input.photoUri ?? null,
        notes: input.notes ?? null,
        createdAt: new Date(),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["food_logs", vars.babyId] });
    },
    onError: (e) => console.error('[useSaveFoodLog]', e),
  });
}

export const FOOD_GROUPS: Record<string, string> = {
  fruit: "🍎 Frutas",
  vegetable: "🥕 Verduras",
  protein: "🥩 Proteínas",
  grain: "🌾 Cereales",
  dairy: "🧀 Lácteos",
  legume: "🫘 Legumbres",
};

const GROUP_PROPERTY: Record<string, "laxative" | "astringent" | "both" | "neutral"> = {
  apple: "astringent",
  pear: "laxative",
  banana: "astringent",
  papaya: "laxative",
  avocado: "neutral",
  mango: "laxative",
  prune: "laxative",
  carrot: "astringent",
  pumpkin: "neutral",
  potato: "astringent",
  sweet_potato: "laxative",
  broccoli: "neutral",
  chayote: "neutral",
  chicken: "neutral",
  beef: "neutral",
  white_fish: "neutral",
  egg: "neutral",
  tofu: "neutral",
  rice: "astringent",
  oats: "neutral",
  quinoa: "neutral",
  corn: "neutral",
  yogurt: "neutral",
  fresh_cheese: "neutral",
  bean: "neutral",
  lentil: "neutral",
  chickpea: "neutral",
};

export const DEFAULT_FOODS: Array<{
  id: string;
  name: string;
  emoji: string;
  group: string;
  allergens: string;
}> = [
  { id: "apple", name: "Manzana", emoji: "🍎", group: "fruit", allergens: "" },
  { id: "pear", name: "Pera", emoji: "🍐", group: "fruit", allergens: "" },
  { id: "banana", name: "Plátano", emoji: "🍌", group: "fruit", allergens: "" },
  { id: "papaya", name: "Papaya", emoji: "🍈", group: "fruit", allergens: "" },
  { id: "avocado", name: "Aguacate", emoji: "🥑", group: "fruit", allergens: "" },
  { id: "mango", name: "Mango", emoji: "🥭", group: "fruit", allergens: "" },
  { id: "prune", name: "Ciruela", emoji: "🫐", group: "fruit", allergens: "" },
  { id: "carrot", name: "Zanahoria", emoji: "🥕", group: "vegetable", allergens: "" },
  { id: "pumpkin", name: "Calabaza", emoji: "🎃", group: "vegetable", allergens: "" },
  { id: "potato", name: "Papa", emoji: "🥔", group: "vegetable", allergens: "" },
  { id: "sweet_potato", name: "Camote", emoji: "🍠", group: "vegetable", allergens: "" },
  { id: "broccoli", name: "Brócoli", emoji: "🥦", group: "vegetable", allergens: "" },
  { id: "chayote", name: "Chayote", emoji: "🥒", group: "vegetable", allergens: "" },
  { id: "chicken", name: "Pollo", emoji: "🍗", group: "protein", allergens: "" },
  { id: "beef", name: "Res", emoji: "🥩", group: "protein", allergens: "" },
  { id: "white_fish", name: "Pescado blanco", emoji: "🐟", group: "protein", allergens: "fish" },
  { id: "egg", name: "Huevo", emoji: "🥚", group: "protein", allergens: "egg" },
  { id: "tofu", name: "Tofu", emoji: "🫘", group: "protein", allergens: "soy" },
  { id: "rice", name: "Arroz", emoji: "🍚", group: "grain", allergens: "" },
  { id: "oats", name: "Avena", emoji: "🥣", group: "grain", allergens: "" },
  { id: "quinoa", name: "Quinoa", emoji: "🌾", group: "grain", allergens: "" },
  { id: "corn", name: "Maíz", emoji: "🌽", group: "grain", allergens: "" },
  { id: "yogurt", name: "Yogur natural", emoji: "🥛", group: "dairy", allergens: "milk" },
  { id: "fresh_cheese", name: "Queso fresco", emoji: "🧀", group: "dairy", allergens: "milk" },
  { id: "bean", name: "Frijol", emoji: "🫘", group: "legume", allergens: "" },
  { id: "lentil", name: "Lenteja", emoji: "🫘", group: "legume", allergens: "" },
  { id: "chickpea", name: "Garbanzo", emoji: "🫘", group: "legume", allergens: "" },
];

export function seedFoodCatalog() {
  const db = getDb();
  const now = Date.now();
  for (const food of DEFAULT_FOODS) {
    const property = GROUP_PROPERTY[food.id] ?? "neutral";
    db.insert(foodCatalog)
      .values({
        id: food.id,
        name: food.name,
        emoji: food.emoji,
        group: food.group as any,
        property,
        allergens: food.allergens || null,
        isSystem: true,
        createdAt: new Date(now),
      })
      .onConflictDoNothing()
      .run();
  }
}
