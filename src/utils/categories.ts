export interface CategoryDef {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "health",       emoji: "💊", label: "Salud",       color: "#EF5350" },
  { id: "feeding",      emoji: "🤱", label: "Alimentación", color: "#FFA726" },
  { id: "growth",       emoji: "📏", label: "Crecimiento",  color: "#66BB6A" },
  { id: "diaper",       emoji: "🍑", label: "Pañal",       color: "#AB47BC" },
  { id: "other",        emoji: "📌", label: "Otros",       color: "#78909C" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(catId: string): CategoryDef {
  return CATEGORY_MAP[catId] ?? { id: catId, emoji: "📝", label: catId, color: "#78909C" };
}

export function getCategoryLabel(catId: string): string {
  return getCategory(catId).label;
}

export function getCategoryEmoji(catId: string): string {
  return getCategory(catId).emoji;
}

/** Categories available for user-created event types (excludes diaper only) */
export const USER_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== "diaper"
);
