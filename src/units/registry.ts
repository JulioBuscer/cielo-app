import type { Unit } from "./types";

export const units: Record<string, Unit> = {
  // ─── Mass ─────────────────────────────────────────────────────────────
  gram: {
    id: "gram",
    name: "Gramo",
    symbol: "g",
    dimension: "mass",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  kilogram: {
    id: "kilogram",
    name: "Kilogramo",
    symbol: "kg",
    dimension: "mass",
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  pound: {
    id: "pound",
    name: "Libra",
    symbol: "lb",
    dimension: "mass",
    toBase: (v) => v * 453.592,
    fromBase: (v) => v / 453.592,
  },
  ounce: {
    id: "ounce",
    name: "Onza",
    symbol: "oz",
    dimension: "mass",
    toBase: (v) => v * 28.3495,
    fromBase: (v) => v / 28.3495,
  },

  // ─── Volume ───────────────────────────────────────────────────────────
  milliliter: {
    id: "milliliter",
    name: "Mililitro",
    symbol: "mL",
    dimension: "volume",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  liter: {
    id: "liter",
    name: "Litro",
    symbol: "L",
    dimension: "volume",
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  fluidOunce: {
    id: "fluidOunce",
    name: "Onza líquida",
    symbol: "fl oz",
    dimension: "volume",
    toBase: (v) => v * 29.5735,
    fromBase: (v) => v / 29.5735,
  },

  // ─── Temperature ──────────────────────────────────────────────────────
  celsius: {
    id: "celsius",
    name: "Celsius",
    symbol: "°C",
    dimension: "temperature",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  fahrenheit: {
    id: "fahrenheit",
    name: "Fahrenheit",
    symbol: "°F",
    dimension: "temperature",
    toBase: (v) => (v - 32) / 1.8,
    fromBase: (v) => v * 1.8 + 32,
  },

  // ─── Length ───────────────────────────────────────────────────────────
  millimeter: {
    id: "millimeter",
    name: "Milímetro",
    symbol: "mm",
    dimension: "length",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  centimeter: {
    id: "centimeter",
    name: "Centímetro",
    symbol: "cm",
    dimension: "length",
    toBase: (v) => v * 10,
    fromBase: (v) => v / 10,
  },
  meter: {
    id: "meter",
    name: "Metro",
    symbol: "m",
    dimension: "length",
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  inch: {
    id: "inch",
    name: "Pulgada",
    symbol: "in",
    dimension: "length",
    toBase: (v) => v * 25.4,
    fromBase: (v) => v / 25.4,
  },

  // ─── Dimensionless ────────────────────────────────────────────────────
  count: {
    id: "count",
    name: "Conteo",
    symbol: "",
    dimension: "dimensionless",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
};

export function getUnit(id: string): Unit | undefined {
  return units[id];
}

export function getUnitsByDimension(dimension: string): Unit[] {
  return Object.values(units).filter((u) => u.dimension === dimension);
}
