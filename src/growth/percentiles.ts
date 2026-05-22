import {
  getLMSTable,
  valueForZ,
  zScoreForValue,
  percentileForValue,
  REF_PERCENTILES,
  type Sex,
  type GrowthMetric,
  type LMSRow,
} from "./whoData";

export interface BabyDataPoint {
  label: string;
  ageMonths: number;
  value: number;
}

export interface PercentileCurve {
  label: string;
  z: number;
  points: { month: number; value: number }[];
}

function interpolateLMS(table: LMSRow[], month: number): LMSRow | null {
  if (month <= table[0].month) return table[0];
  if (month >= table[table.length - 1].month) return table[table.length - 1];

  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (month >= a.month && month <= b.month) {
      const t = (month - a.month) / (b.month - a.month);
      return {
        month,
        L: a.L + (b.L - a.L) * t,
        M: a.M + (b.M - a.M) * t,
        S: a.S + (b.S - a.S) * t,
      };
    }
  }
  return table[table.length - 1];
}

export function getReferenceCurves(
  sex: Sex,
  metric: GrowthMetric
): PercentileCurve[] {
  const table = getLMSTable(sex, metric);
  const months = table.map((r) => r.month);

  return REF_PERCENTILES.map(({ z, label }) => ({
    label,
    z,
    points: months.map((m) => {
      const row = interpolateLMS(table, m);
      return { month: m, value: row ? valueForZ(row.L, row.M, row.S, z) : 0 };
    }),
  }));
}

export function calcPercentile(
  sex: Sex,
  metric: GrowthMetric,
  ageMonths: number,
  value: number
): { z: number; percentile: number; row: LMSRow | null } {
  const table = getLMSTable(sex, metric);
  const row = interpolateLMS(table, ageMonths);
  if (!row) return { z: 0, percentile: 50, row: null };
  const z = zScoreForValue(row.L, row.M, row.S, value);
  const p = percentileForValue(row.L, row.M, row.S, value);
  return { z, percentile: Math.round(p * 10) / 10, row };
}

export function calcPercentileLabel(p: number): string {
  if (p >= 97) return "> P97";
  if (p >= 85) return "P85–P97";
  if (p >= 50) return "P50–P85";
  if (p >= 15) return "P15–P50";
  if (p >= 3) return "P3–P15";
  return "< P3";
}

export function getMetricLabel(metric: GrowthMetric): string {
  switch (metric) {
    case "weight": return "Peso";
    case "height": return "Talla";
    case "headCircumference": return "C. Cefálico";
  }
}

export function getMetricUnit(metric: GrowthMetric): string {
  switch (metric) {
    case "weight": return "kg";
    case "height": return "cm";
    case "headCircumference": return "cm";
  }
}
