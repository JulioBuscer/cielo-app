export const FOOD_GROUPS = ['fruit', 'vegetable', 'grain', 'protein', 'fat'] as const;
export type FoodGroup = (typeof FOOD_GROUPS)[number];

export interface GeneratorFood {
  id: string;
  name: string;
  group: FoodGroup;
  property: 'laxative' | 'astringent' | 'both' | 'neutral' | null;
  effect: 'laxative' | 'astringent' | 'regulator' | null;
}

export interface ExistingPlanItem {
  foodId: string;
  dayOfWeek: number;
  locked: boolean;
}

export interface PlanSuggestion {
  foodId: string;
  dayOfWeek: number;
  isNew: boolean;
  reason: 'locked' | 'existing' | 'new_food' | 'group_fill' | 'tendency';
}

export interface GenerateOptions {
  mode: 'day' | 'week';
  targetDay?: number;
  keepExisting: boolean;
  foods: GeneratorFood[];
  consumed: Set<string>;
  frequency: Map<string, number>;
  watchlist: Set<string>;
  existingPlans: ExistingPlanItem[];
}

function getPropertyWeight(property: GeneratorFood['property']): number {
  switch (property) {
    case 'laxative': return 3;
    case 'both': return 2;
    case 'neutral': return 1;
    case 'astringent': return -1;
    default: return 0;
  }
}

function groupCoveragePenalty(selected: GeneratorFood[]): number {
  const groups = new Set(selected.map((f) => f.group));
  return FOOD_GROUPS.length - groups.size;
}

function balancePenalty(selected: GeneratorFood[]): number {
  let ast = 0;
  for (const f of selected) {
    if (f.property === 'astringent') ast++;
  }
  const total = selected.length || 1;
  const astRatio = ast / total;
  if (astRatio > 0.15) return astRatio * 10;
  return 0;
}

function gapScore(foodId: string, dayOfWeek: number, assigned: Map<number, string[]>): number {
  const prev1 = assigned.get(dayOfWeek - 1) ?? [];
  const prev2 = assigned.get(dayOfWeek - 2) ?? [];
  const prev3 = assigned.get(dayOfWeek - 3) ?? [];
  const inPrev1 = prev1.includes(foodId) ? 1 : 0;
  const inPrev2 = prev2.includes(foodId) ? 1 : 0;
  const inPrev3 = prev3.includes(foodId) ? 1 : 0;
  const inPrev4 = (assigned.get(dayOfWeek - 4) ?? []).includes(foodId) ? 1 : 0;
  const cons3 = inPrev1 > 0 && inPrev2 > 0 && inPrev3 > 0 ? 1 : 0;
  const cons2 = inPrev1 > 0 && inPrev2 > 0 ? 1 : 0;
  if (cons3) return -30;
  if (cons2) return -15;
  if (inPrev1 > 0) return -5;
  if (inPrev2 > 0 && inPrev3 > 0) return -3;
  if (inPrev3 > 0 && inPrev4 > 0) return -2;
  return 0;
}

function weeklyUsageCount(foodId: string, assigned: Map<number, string[]>): number {
  let count = 0;
  for (const [, ids] of assigned) {
    if (ids.includes(foodId)) count++;
  }
  return count;
}

function pickBestFill(
  candidates: GeneratorFood[],
  dayOfWeek: number,
  assigned: Map<number, string[]>,
  frequency: Map<string, number>,
  dayFoods: GeneratorFood[],
  watchlist: Set<string> = new Set(),
): GeneratorFood | null {
  let best: GeneratorFood | null = null;
  let bestScore = -Infinity;
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  for (const food of shuffled) {
    let score = frequency.get(food.id) ?? 0;
    score += gapScore(food.id, dayOfWeek, assigned);
    const propWeight = getPropertyWeight(food.property);
    score += propWeight * 0.5;
    const pen = balancePenalty([...dayFoods, food]);
    score -= pen * 2;
    if (food.property === 'astringent') {
      const dayAstCount = dayFoods.filter((f) => f.property === 'astringent').length;
      if (dayAstCount >= 1) score -= 15;
    }
    if (food.effect === 'regulator') score += 1;
    if (food.property === 'neutral') score += 2;
    const wCount = weeklyUsageCount(food.id, assigned);
    if (wCount >= 3) score -= 50;
    else if (wCount >= 2) score -= 10;
    if (watchlist.has(food.id)) score += 4;
    score += (Math.random() - 0.5) * 10;
    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }
  return best;
}

export function generateMealPlan(options: GenerateOptions): PlanSuggestion[] {
  const { mode, targetDay, keepExisting, foods, consumed, frequency, watchlist, existingPlans } = options;
  const result: PlanSuggestion[] = [];
  const days = mode === 'day' && targetDay != null ? [targetDay] : [0, 1, 2, 3, 4, 5, 6];
  const foodsByGroup = new Map<FoodGroup, GeneratorFood[]>();
  for (const group of FOOD_GROUPS) {
    foodsByGroup.set(group, foods.filter((f) => f.group === group));
  }
  const foodMap = new Map<string, GeneratorFood>();
  for (const f of foods) foodMap.set(f.id, f);

  const planIntroduced = new Set<string>();

  const assigned = new Map<number, string[]>();
  for (const day of days) assigned.set(day, []);

  for (const plan of existingPlans) {
    if (days.includes(plan.dayOfWeek)) {
      assigned.get(plan.dayOfWeek)!.push(plan.foodId);
      if (!consumed.has(plan.foodId)) planIntroduced.add(plan.foodId);
      if (plan.locked || keepExisting) {
        result.push({
          foodId: plan.foodId,
          dayOfWeek: plan.dayOfWeek,
          isNew: !consumed.has(plan.foodId),
          reason: plan.locked ? 'locked' : 'existing',
        });
      }
    }
  }

  const usedNewFoodIds = new Set<string>();
  const newFoodsPerDay = new Map<number, number>();
  const groupCount = new Map<FoodGroup, number>();
  for (const g of FOOD_GROUPS) groupCount.set(g, 0);
  for (const day of days) {
    const dayFoodIds = assigned.get(day)!;
    const dayGroups = new Set(dayFoodIds.map((fid) => foodMap.get(fid)?.group).filter(Boolean));
    for (const g of dayGroups) groupCount.set(g as FoodGroup, (groupCount.get(g as FoodGroup) ?? 0) + 1);
  }

  function pickNewFood(group: FoodGroup, day: number, dayFoodIds: string[]): GeneratorFood | null {
    const alreadyUsed = (f: GeneratorFood) => usedNewFoodIds.has(f.id) || dayFoodIds.includes(f.id) || planIntroduced.has(f.id);
    const gapOk = (f: GeneratorFood) => gapScore(f.id, day, assigned) > -10;
    const pick = (pool: GeneratorFood[]) => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.find(gapOk) ?? shuffled[0] ?? null;
    };
    const watchlistPool = foods.filter(
      (f) => f.group === group && watchlist.has(f.id) && !consumed.has(f.id) && !alreadyUsed(f),
    );
    if (watchlistPool.length > 0) return pick(watchlistPool);
    const catalogPool = foods.filter(
      (f) => f.group === group && !consumed.has(f.id) && !alreadyUsed(f),
    );
    if (catalogPool.length > 0) return pick(catalogPool);
    return null;
  }

  for (const day of days) {
    const dayFoodIds = assigned.get(day)!;
    const dayGroups = new Set(dayFoodIds.map((fid) => foodMap.get(fid)?.group).filter(Boolean) as FoodGroup[]);
    const missingGroups = FOOD_GROUPS.filter((g) => !dayGroups.has(g));
    if (missingGroups.length === 0) continue;

    const sortedGroups = [...missingGroups].sort((a, b) => (groupCount.get(a) ?? 0) - (groupCount.get(b) ?? 0));
    for (const group of sortedGroups) {
      if ((newFoodsPerDay.get(day) ?? 0) >= 1) break;
      const picked = pickNewFood(group, day, dayFoodIds);
      if (picked) {
        usedNewFoodIds.add(picked.id);
        planIntroduced.add(picked.id);
        newFoodsPerDay.set(day, (newFoodsPerDay.get(day) ?? 0) + 1);
        dayFoodIds.push(picked.id);
        groupCount.set(picked.group, (groupCount.get(picked.group) ?? 0) + 1);
        result.push({
          foodId: picked.id,
          dayOfWeek: day,
          isNew: true,
          reason: 'new_food',
        });
      }
    }
  }

  for (const day of days) {
    const dayFoodIds = assigned.get(day)!;
    const dayFoods = dayFoodIds.map((fid) => foodMap.get(fid)).filter(Boolean) as GeneratorFood[];
    const dayGroups = new Set(dayFoods.map((f) => f.group));
    const missingGroups = FOOD_GROUPS.filter((g) => !dayGroups.has(g));
    if (missingGroups.length === 0) continue;

    for (const group of missingGroups) {
      const pool = foods.filter(
        (f) =>
          f.group === group &&
          !dayFoodIds.includes(f.id) &&
          gapScore(f.id, day, assigned) > -100 &&
          consumed.has(f.id),
      );
      if (pool.length === 0) continue;
      const best = pickBestFill(pool, day, assigned, frequency, dayFoods, watchlist);
      if (best) {
        dayFoodIds.push(best.id);
        result.push({
          foodId: best.id,
          dayOfWeek: day,
          isNew: false,
          reason: best.effect === 'regulator' || best.property === 'neutral' ? 'tendency' : 'group_fill',
        });
      }
    }
  }

  return result;
}

export function computeBalanceStats(foods: GeneratorFood[]) {
  let lax = 0, ast = 0, both = 0, neu = 0;
  for (const f of foods) {
    if (f.property === 'laxative') lax++;
    else if (f.property === 'astringent') ast++;
    else if (f.property === 'both') both++;
    else if (f.property === 'neutral') neu++;
  }
  const total = foods.length || 1;
  return {
    laxative: lax,
    astringent: ast,
    both,
    neutral: neu,
    laxRatio: (lax + both) / total,
    astRatio: ast / total,
    label: `${'🟢'.repeat(lax)}${'🔵'.repeat(both)}${'⚪'.repeat(neu)}${'🔴'.repeat(ast)}`,
  };
}
