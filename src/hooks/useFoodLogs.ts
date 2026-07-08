import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, desc, asc, and, gte, lte, count as drizzleCount } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { foodCatalog, foodLogs } from "@/src/db/schema";
import { generateId } from "@/src/utils/id";
import { resolveProfileId } from "@/src/utils/storage";
import { onMutationError } from "@/src/utils/mutationError";

export function useFoodCatalog() {
  return useQuery({
    queryKey: ["food_catalog"],
    queryFn: () => getDb()
      .select()
      .from(foodCatalog)
      .where(eq(foodCatalog.hidden, false as any))
      .orderBy(foodCatalog.name),
    staleTime: Infinity,
    gcTime: Infinity,
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

export function useCreateFoodCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      emoji?: string;
      group: string;
      allergens: string[];
      subgroup?: string;
    }) => {
      const id = input.name.toLowerCase().replace(/[^a-záéíóúñ]/g, "_");
      await getDb().insert(foodCatalog).values({
        id,
        name: input.name.trim(),
        emoji: input.emoji ?? null,
        group: input.group as any,
        property: "neutral",
        allergens: input.allergens.length > 0 ? input.allergens.join(",") : null,
        subgroup: input.subgroup as any ?? null,
        isSystem: false,
        createdAt: new Date(),
      }).run();
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food_catalog'] });
      qc.invalidateQueries({ queryKey: ['food_catalog_all'] });
    },
    onError: onMutationError("[useCreateFoodCatalogItem]"),
  });
}

export function useUpdateFoodCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      emoji?: string;
      group: string;
      property: string;
      allergens: string[];
      effect?: string | null;
      isAllergen?: boolean;
      allergenDetails?: string | null;
      warning?: string | null;
      warningType?: string | null;
      secondaryGroups?: string | null;
      subgroup?: string | null;
    }) => {
      await getDb().update(foodCatalog)
        .set({
          name: input.name.trim(),
          emoji: input.emoji || null,
          group: input.group as any,
          property: input.property as any,
          effect: input.effect as any ?? null,
          allergens: input.allergens.length > 0 ? input.allergens.join(",") : null,
          isAllergen: input.isAllergen ?? false,
          allergenDetails: input.allergenDetails ?? null,
          warning: input.warning || null,
          warningType: input.warningType as any ?? null,
          secondaryGroups: input.secondaryGroups ?? null,
          subgroup: input.subgroup as any ?? null,
        })
        .where(eq(foodCatalog.id, input.id))
        .run();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food_catalog'] });
      qc.invalidateQueries({ queryKey: ['food_catalog_all'] });
    },
    onError: onMutationError("[useUpdateFoodCatalog]"),
  });
}

export function useDeleteFoodCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
    }) => {
      // Count existing logs to decide: delete or soft-hide
      const [{ c }] = await getDb().select({ c: drizzleCount() }).from(foodLogs).where(eq(foodLogs.foodId, input.id));
      const hasLogs = Number(c) > 0;
      if (hasLogs) {
        await getDb().update(foodCatalog).set({ hidden: true as any }).where(eq(foodCatalog.id, input.id)).run();
        return "hidden";
      } else {
        await getDb().delete(foodCatalog).where(eq(foodCatalog.id, input.id)).run();
        return "deleted";
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food_catalog'] });
      qc.invalidateQueries({ queryKey: ['food_catalog_all'] });
    },
    onError: onMutationError("[useDeleteFoodCatalog]"),
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
      const profileId = await resolveProfileId();
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
    onError: onMutationError("[useSaveFoodLog]"),
  });
}

export const FOOD_GROUPS: Record<string, string> = {
  fruit: "🍎 Frutas",
  vegetable: "🥕 Verduras",
  grain: "🌾 Cereales",
  protein: "🥩 Proteína",
  fat: "🥑 Grasas",
};

export const SUBGROUPS: Record<string, string> = {
  cereal: "🌾 Cereales",
  tuber: "🥔 Tubérculos",
  animal: "🥩 Animal",
  dairy: "🧀 Lácteos",
  legume: "🫘 Legumbres",
  vegetable_protein: "🌱 Prot. vegetal",
  oil: "🫒 Aceites",
  seed: "🌻 Semillas",
  nut_butter: "🥜 Mantequillas",
};

export const BADGE_FILTERS = [
  { key: "allergen", label: "🚨 Alérgeno", test: (f: any) => f.isAllergen },
  { key: "warning", label: "⚠️ Precaución", test: (f: any) => f.warning },
  { key: "laxative", label: "🟢 Laxante", test: (f: any) => f.effect === "laxative" },
  { key: "astringent", label: "🟤 Astringente", test: (f: any) => f.effect === "astringent" },
  { key: "regulator", label: "🔄 Regulador", test: (f: any) => f.effect === "regulator" },
] as const;

const SEED: Array<{
  id: string; name: string; emoji: string; group: string;
  property?: "laxative" | "astringent" | "both" | "neutral";
  effect?: "laxative" | "astringent" | "regulator";
  allergens?: string; isAllergen?: boolean; allergenDetails?: string;
  warning?: string; warningType?: string;
  secondaryGroups?: string;
  subgroup?: string;
}> = [
  // ── Cereales (grain) ─────────────────────────────────────────────
  { id: "amaranth",     name: "Amaranto",       emoji: "🌾", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   warning: "", warningType: "" },
  { id: "rice_white",   name: "Arroz blanco",   emoji: "🍚", group: "grain", subgroup: "cereal", property: "astringent", effect: "astringent", warning: "", warningType: "" },
  { id: "rice_brown",   name: "Arroz integral",  emoji: "🌾", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   warning: "", warningType: "" },
  { id: "oats",         name: "Avena natural",   emoji: "🥣", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   warning: "", warningType: "" },
  { id: "sweet_potato", name: "Camote / Batata", emoji: "🍠", group: "grain", subgroup: "tuber",  property: "laxative",   effect: "laxative",   warning: "", warningType: "" },
  { id: "barley",       name: "Cebada",          emoji: "🌾", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   allergens: "wheat", isAllergen: true, allergenDetails: "Contiene gluten; introducir temprano", warning: "", warningType: "" },
  { id: "rye",          name: "Centeno",         emoji: "🌾", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   allergens: "wheat", isAllergen: true, allergenDetails: "Contiene gluten; aportar temprano", warning: "", warningType: "" },
  { id: "oat_flour",    name: "Harina de avena", emoji: "🥣", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   warning: "", warningType: "" },
  { id: "corn_flour",   name: "Harina de maíz",  emoji: "🌽", group: "grain", subgroup: "cereal", property: "astringent", effect: "astringent", warning: "", warningType: "" },
  { id: "corn_grain",   name: "Maíz en grano",   emoji: "🌽", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   warning: "Riesgo de asfixia si se da entero; ofrecer molido/triturado", warningType: "choking" },
  { id: "polenta",      name: "Polenta",         emoji: "🌽", group: "grain", subgroup: "cereal", property: "astringent", effect: "astringent", warning: "", warningType: "" },
  { id: "bread_whole",  name: "Pan integral",    emoji: "🍞", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   allergens: "wheat", isAllergen: true, allergenDetails: "Contiene trigo/gluten", warning: "", warningType: "" },
  { id: "potato",       name: "Papa",            emoji: "🥔", group: "grain", subgroup: "tuber",  property: "astringent", effect: "astringent", warning: "", warningType: "" },
  { id: "pasta_wheat",  name: "Pasta de trigo",  emoji: "🍝", group: "grain", subgroup: "cereal", property: "astringent", effect: "astringent", allergens: "wheat", isAllergen: true, allergenDetails: "Introducción de trigo/gluten", warning: "", warningType: "" },
  { id: "plantain",     name: "Plátano macho",   emoji: "🍌", group: "grain", subgroup: "tuber",  property: "both",       effect: "regulator",  warning: "Depende de maduración: verde estriñe, maduro regula", warningType: "" },
  { id: "quinoa",       name: "Quinoa",          emoji: "🌾", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   warning: "", warningType: "" },
  { id: "wheat_grain",  name: "Trigo en grano",  emoji: "🌾", group: "grain", subgroup: "cereal", property: "laxative",   effect: "laxative",   allergens: "wheat", isAllergen: true, allergenDetails: "Introducción clave de gluten", warning: "", warningType: "" },
  { id: "cassava",      name: "Yuca",            emoji: "🥔", group: "grain", subgroup: "tuber",  property: "astringent", effect: "astringent", warning: "", warningType: "" },

  // ── Proteína (protein) ──────────────────────────────────────────
  { id: "tuna",         name: "Atún",           emoji: "🐟", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", allergens: "fish", isAllergen: true, allergenDetails: "Alérgeno mayor. Preferir lomo fresco, evitar enlatado", warning: "", warningType: "" },
  { id: "shrimp",       name: "Camarón",        emoji: "🦐", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", allergens: "shellfish", isAllergen: true, allergenDetails: "Alérgeno mayor: mariscos", warning: "", warningType: "" },
  { id: "pork",         name: "Cerdo magro",    emoji: "🥩", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", warning: "", warningType: "" },
  { id: "beef",         name: "Res / Ternera",  emoji: "🥩", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", warning: "", warningType: "" },
  { id: "liver",        name: "Hígado",         emoji: "🥩", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", warning: "Máximo 1 vez por semana por exceso de Vitamina A", warningType: "vitamin_a" },
  { id: "egg",          name: "Huevo",          emoji: "🥚", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", allergens: "egg", isAllergen: true, allergenDetails: "Alérgeno mayor. Ofrecer completamente cocido desde 6 meses", warning: "", warningType: "" },
  { id: "turkey",       name: "Pavo",           emoji: "🦃", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", warning: "", warningType: "" },
  { id: "white_fish",   name: "Pescado blanco", emoji: "🐟", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", allergens: "fish", isAllergen: true, allergenDetails: "Alérgeno mayor: lenguado, merluza", warning: "", warningType: "" },
  { id: "chicken",      name: "Pollo",          emoji: "🍗", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", warning: "", warningType: "" },
  { id: "fatty_fish",   name: "Pescado azul",   emoji: "🐟", group: "protein", subgroup: "animal", property: "neutral", effect: "regulator", allergens: "fish", isAllergen: true, allergenDetails: "Alérgeno mayor. Rico en DHA/EPA", warning: "", warningType: "" },
  { id: "yogurt",       name: "Yogurt natural",    emoji: "🥛", group: "protein", subgroup: "dairy", property: "laxative", effect: "laxative", allergens: "milk", isAllergen: true, allergenDetails: "A partir de 9-10 meses. Alérgeno mayor", warning: "A partir de 9-10 meses", warningType: "age_restriction" },
  { id: "fresh_cheese", name: "Queso fresco",      emoji: "🧀", group: "protein", subgroup: "dairy", property: "astringent", effect: "astringent", allergens: "milk", isAllergen: true, allergenDetails: "A partir de 9-10 meses. Alérgeno mayor", warning: "A partir de 9-10 meses, bajo en sal", warningType: "age_restriction" },
  { id: "jocoque",      name: "Jocoque sin sal",   emoji: "🥣", group: "protein", subgroup: "dairy", property: "laxative", effect: "laxative", allergens: "milk", isAllergen: true, allergenDetails: "A partir de 9-10 meses por proteína intacta de vaca", warning: "", warningType: "age_restriction" },
  { id: "kefir",        name: "Kéfir de leche",    emoji: "🥛", group: "protein", subgroup: "dairy", property: "laxative", effect: "laxative", allergens: "milk", isAllergen: true, allergenDetails: "Alérgeno y restricción de edad; probiótico denso", warning: "A partir de 9-10 meses", warningType: "age_restriction" },
  { id: "butter",       name: "Mantequilla sin sal", emoji: "🧈", group: "protein", subgroup: "dairy", property: "laxative", effect: "laxative", warning: "Usar solo como grasa de cocción en cantidades mínimas", warningType: "", secondaryGroups: "fat" },
  { id: "soy",          name: "Soya en grano", emoji: "🫘", group: "protein", subgroup: "vegetable_protein", property: "laxative", effect: "laxative", allergens: "soy", isAllergen: true, allergenDetails: "Alérgeno mayor. Alérgeno mayor y gran aporte de fibra", warning: "", warningType: "" },
  { id: "tofu",         name: "Tofu",          emoji: "⬜", group: "protein", subgroup: "vegetable_protein", property: "neutral", effect: "regulator", allergens: "soy", isAllergen: true, allergenDetails: "Derivado de la soya. Fácil de ofrecer en cubos BLW", warning: "", warningType: "" },
  { id: "white_bean",   name: "Frijoles blancos", emoji: "🫘", group: "protein", subgroup: "legume", property: "laxative", effect: "laxative", warning: "", warningType: "", secondaryGroups: "grain" },
  { id: "peas",         name: "Chícharos",       emoji: "🫛", group: "protein", subgroup: "legume", property: "laxative", effect: "laxative", warning: "", warningType: "", secondaryGroups: "grain" },
  { id: "edamame",      name: "Edamame",         emoji: "🫛", group: "protein", subgroup: "legume", property: "laxative", effect: "laxative", allergens: "soy", isAllergen: true, allergenDetails: "La soya es un alérgeno mayor; aporta fibra intestinal", warning: "", warningType: "", secondaryGroups: "grain" },
  { id: "green_bean",   name: "Ejotes",          emoji: "🫛", group: "protein", subgroup: "legume", property: "laxative", effect: "laxative", warning: "", warningType: "", secondaryGroups: "grain" },
  { id: "black_bean",   name: "Frijoles negros", emoji: "🫘", group: "protein", subgroup: "legume", property: "laxative", effect: "laxative", warning: "", warningType: "", secondaryGroups: "grain" },
  { id: "chickpea",     name: "Garbanzos",       emoji: "🫘", group: "protein", subgroup: "legume", property: "laxative", effect: "laxative", warning: "", warningType: "", secondaryGroups: "grain" },
  { id: "broad_bean",   name: "Habas",           emoji: "🫘", group: "protein", subgroup: "legume", property: "laxative", effect: "laxative", warning: "", warningType: "", secondaryGroups: "grain" },
  { id: "lentil",       name: "Lentejas",        emoji: "🫘", group: "protein", subgroup: "legume", property: "laxative", effect: "laxative", warning: "Iniciar con lenteja roja pelada por ser más suave para el colon del bebé", warningType: "", secondaryGroups: "grain" },

  // ── Verduras (vegetable) ─────────────────────────────────────────
  { id: "swiss_chard",  name: "Acelgas",         emoji: "🥬", group: "vegetable", property: "laxative", effect: "laxative", warning: "Limitar porción antes de 12 meses por nitratos", warningType: "nitrates" },
  { id: "eggplant",     name: "Berenjena",       emoji: "🍆", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "beetroot",     name: "Betabel",         emoji: "🪵", group: "vegetable", property: "laxative", effect: "laxative", warning: "Alto en nitratos; limitar porción antes de 12 meses", warningType: "nitrates" },
  { id: "broccoli",     name: "Brócoli",         emoji: "🥦", group: "vegetable", property: "laxative", effect: "laxative", warning: "Puede causar gases benignos", warningType: "" },
  { id: "zucchini",     name: "Calabacín",       emoji: "🥒", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "squash",       name: "Calabaza amarilla", emoji: "🎃", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "onion_cooked", name: "Cebolla cocida",  emoji: "🧅", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "garlic_cooked",name: "Ajo cocido",      emoji: "🧄", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "mushroom",     name: "Champiñón",       emoji: "🍄", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "chayote",      name: "Chayote",         emoji: "🥒", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "cabbage",      name: "Col / Repollo",   emoji: "🥬", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "cauliflower",  name: "Coliflor",        emoji: "🥦", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "asparagus",    name: "Espárragos",      emoji: "🫛", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "spinach",      name: "Espinacas",       emoji: "🥬", group: "vegetable", property: "laxative", effect: "laxative", warning: "Máximo 30g diarios antes de 12 meses por nitratos", warningType: "nitrates" },
  { id: "yardlong_bean",name: "Habichuela",      emoji: "🫛", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "kale",         name: "Kale / Col rizada", emoji: "🥬", group: "vegetable", property: "laxative", effect: "laxative", warning: "Limitar ración antes del año por nitratos", warningType: "nitrates" },
  { id: "lettuce",      name: "Lechuga",         emoji: "🥬", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "cucumber",     name: "Pepino",          emoji: "🥒", group: "vegetable", property: "laxative", effect: "laxative", warning: "Ofrecer sin semillas ni cáscara inicialmente", warningType: "" },
  { id: "bell_pepper",  name: "Pimiento morrón", emoji: "🫑", group: "vegetable", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "tomato",       name: "Tomate",          emoji: "🍅", group: "vegetable", property: "laxative", effect: "laxative", warning: "Su acidez natural puede causar enrojecimiento cutáneo", warningType: "" },
  { id: "tomato_cherry",name: "Tomate cherry",   emoji: "🍅", group: "vegetable", property: "laxative", effect: "laxative", warning: "Riesgo de asfixia: cortar en 4 a lo largo", warningType: "choking" },
  { id: "carrot",       name: "Zanahoria",       emoji: "🥕", group: "vegetable", property: "astringent", effect: "astringent", warning: "", warningType: "" },

  // ── Frutas (fruit) ───────────────────────────────────────────────
  { id: "blueberry",    name: "Arándano azul",  emoji: "🫐", group: "fruit", property: "laxative", effect: "laxative", warning: "Riesgo de asfixia: ofrecer siempre aplastados uno por uno", warningType: "choking" },
  { id: "cherry",       name: "Cerezas",        emoji: "🍒", group: "fruit", property: "laxative", effect: "laxative", warning: "Retirar siempre el hueso; peligro de asfixia", warningType: "choking" },
  { id: "prune",        name: "Ciruela pasa",   emoji: "🫒", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "coconut",      name: "Coco rallado",   emoji: "🥥", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "", secondaryGroups: "fat" },
  { id: "peach",        name: "Durazno",        emoji: "🍑", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "raspberry",    name: "Frambuesa",      emoji: "🍓", group: "fruit", property: "laxative", effect: "laxative", allergens: "tree_nuts", isAllergen: true, allergenDetails: "Alérgeno secundario / liberador de histamina", warning: "", warningType: "" },
  { id: "strawberry",   name: "Fresa",          emoji: "🍓", group: "fruit", property: "laxative", effect: "laxative", allergens: "tree_nuts", isAllergen: true, allergenDetails: "Monitorear piel por liberación de histamina", warning: "", warningType: "" },
  { id: "guava",        name: "Guayaba",        emoji: "🍐", group: "fruit", property: "astringent", effect: "astringent", warning: "Retirar semillas duras antes de ofrecer", warningType: "" },
  { id: "kiwi",         name: "Kiwi",           emoji: "🥝", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "lemon",        name: "Limón (gotas)",  emoji: "🍋", group: "fruit", property: "both",      effect: "regulator",  warning: "Usar solo gotas; regulador digestivo", warningType: "" },
  { id: "mamey",        name: "Mamey",          emoji: "🥭", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "tangerine",    name: "Mandarina",      emoji: "🍊", group: "fruit", property: "laxative", effect: "laxative", warning: "Ofrecer gajos limpios sin membranas ni semillas", warningType: "" },
  { id: "mango",        name: "Mango",          emoji: "🥭", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "apple",        name: "Manzana",        emoji: "🍎", group: "fruit", property: "both",      effect: "regulator",  warning: "Cocida/puré es astringente; cruda rallada es laxante", warningType: "" },
  { id: "passion_fruit",name: "Maracuyá",       emoji: "🫚", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "melon",        name: "Melón",          emoji: "🍈", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "orange",       name: "Naranja",        emoji: "🍊", group: "fruit", property: "laxative", effect: "laxative", warning: "Solo en gajos limpios", warningType: "" },
  { id: "papaya",       name: "Papaya",         emoji: "🍈", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "pear",         name: "Pera",           emoji: "🍐", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "pineapple",    name: "Piña",           emoji: "🍍", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "banana",       name: "Plátano",        emoji: "🍌", group: "fruit", property: "both",      effect: "regulator",  warning: "Maduro laxante suave; verde estriñe severamente", warningType: "" },
  { id: "watermelon",   name: "Sandía",         emoji: "🍉", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "grapefruit",   name: "Toronja",        emoji: "🍊", group: "fruit", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "grape",        name: "Uva",            emoji: "🍇", group: "fruit", property: "laxative", effect: "laxative", warning: "Alto riesgo de asfixia: cortar en 4 partes a lo largo", warningType: "choking" },

  // ── Grasas (fat) ─────────────────────────────────────────────────
  { id: "avocado",       name: "Aguacate",              emoji: "🥑", group: "fat", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "olive_oil",     name: "Aceite de oliva",       emoji: "🫒", group: "fat", subgroup: "oil", property: "laxative", effect: "laxative", warning: "Añadir una cucharadita cruda sobre la comida", warningType: "" },
  { id: "coconut_oil",   name: "Aceite de coco",        emoji: "🥥", group: "fat", subgroup: "oil", property: "laxative", effect: "laxative", warning: "", warningType: "" },
  { id: "sesame",        name: "Ajonjolí / Sésamo",     emoji: "🫘", group: "fat", subgroup: "seed", property: "laxative", effect: "laxative", allergens: "tree_nuts", isAllergen: true, allergenDetails: "Noveno alérgeno mayor (FASTER Act 2023). Protocolo de 3 días", warning: "", warningType: "" },
  { id: "chia",          name: "Semillas de chía",       emoji: "🌾", group: "fat", subgroup: "seed", property: "laxative", effect: "laxative", warning: "Hidratar antes de ofrecer; forma un gel mucilaginoso", warningType: "" },
  { id: "flaxseed",      name: "Semillas de linaza",     emoji: "🌾", group: "fat", subgroup: "seed", property: "laxative", effect: "laxative", warning: "Ofrecer molidas para absorber omega-3 y fibra", warningType: "" },
  { id: "cacao",         name: "Cacao puro 100%",        emoji: "🍫", group: "fat", property: "neutral", effect: "regulator", warning: "A partir de 10-12 meses. Regulador intestinal suave", warningType: "age_restriction" },
  { id: "peanut_butter", name: "Mantequilla de cacahuate", emoji: "🥜", group: "fat", subgroup: "nut_butter", property: "laxative", effect: "laxative", allergens: "peanut", isAllergen: true, allergenDetails: "Alérgeno mayor. Estudio LEAP demostró reducción de alergias", warning: "Peligro físico: diluir siempre en agua o puré", warningType: "paste" },
  { id: "almond_butter", name: "Mantequilla de almendras", emoji: "🫘", group: "fat", subgroup: "nut_butter", property: "laxative", effect: "laxative", allergens: "tree_nuts", isAllergen: true, allergenDetails: "Alérgeno mayor", warning: "Requerimiento: diluir siempre en agua o puré", warningType: "paste" },
  { id: "walnut_butter", name: "Mantequilla de nuez",     emoji: "🫘", group: "fat", subgroup: "nut_butter", property: "laxative", effect: "laxative", allergens: "tree_nuts", isAllergen: true, allergenDetails: "Alérgeno mayor", warning: "Requerimiento: diluir siempre en agua o puré", warningType: "paste" },
  { id: "sunflower_seed",name: "Semillas de girasol",    emoji: "🌻", group: "fat", subgroup: "seed", property: "laxative", effect: "laxative", warning: "Ofrecer molidas", warningType: "" },
];

export function seedFoodCatalog() {
  const db = getDb();
  const now = Date.now();
  for (const food of SEED) {
    const property = food.property ?? "neutral";
    db.insert(foodCatalog)
      .values({
        id: food.id,
        name: food.name,
        emoji: food.emoji,
        group: food.group as any,
        property,
        effect: food.effect ?? null,
        allergens: food.allergens || null,
        isAllergen: food.isAllergen ?? false,
        allergenDetails: food.allergenDetails ?? null,
        warning: food.warning || null,
        warningType: (food.warningType as any) || null,
        secondaryGroups: food.secondaryGroups || null,
        subgroup: food.subgroup as any ?? null,
        isSystem: true,
        createdAt: new Date(now),
      })
      .onConflictDoNothing()
      .run();
  }
}
