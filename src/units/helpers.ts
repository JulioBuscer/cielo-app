import { getUnit, units } from "./registry";
import type { Unit } from "./types";

export function normalizeToBase(value: number, unitId: string): number {
  const unit = getUnit(unitId);
  if (!unit) return value;
  return unit.toBase(value);
}

export function convert(
  value: number,
  fromUnitId: string,
  toUnitId: string
): number {
  if (fromUnitId === toUnitId) return value;
  const fromUnit = getUnit(fromUnitId);
  const toUnit = getUnit(toUnitId);
  if (!fromUnit || !toUnit) return value;
  if (fromUnit.dimension !== toUnit.dimension) return value;
  return toUnit.fromBase(fromUnit.toBase(value));
}

export function findBestUnit(
  baseValue: number,
  dimension: string
): { unit: Unit; displayValue: number } {
  const candidates = Object.values(units).filter(
    (u) => u.dimension === dimension && u.id !== "count"
  );
  if (candidates.length === 0) {
    const defaultUnit = getUnit("kilogram") ?? getUnit("gram")!;
    return { unit: defaultUnit, displayValue: baseValue };
  }
  let best = candidates[0];
  let bestDisplay = best.fromBase(baseValue);
  for (const u of candidates) {
    const display = u.fromBase(baseValue);
    if (display >= 0.1 && display <= 1000) {
      return { unit: u, displayValue: display };
    }
    if (display > bestDisplay) {
      best = u;
      bestDisplay = display;
    }
  }
  return { unit: best, displayValue: bestDisplay };
}

export function formatWithUnit(
  value: number,
  unitId: string,
  decimals: number = 1
): string {
  const unit = getUnit(unitId);
  if (!unit) return `${value}`;
  const formatted = value.toFixed(decimals);
  return unit.symbol ? `${formatted} ${unit.symbol}` : `${formatted}`;
}
