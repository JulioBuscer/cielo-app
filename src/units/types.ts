import type { ObservationZone } from "@/src/db/schema";

export type UnitDimension = 'mass' | 'volume' | 'temperature' | 'length' | 'dimensionless';

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

export interface EventMetric {
  id: string;
  name: string;
  unitId: string;
  scaleMin?: number;
  scaleMax?: number;
  zones?: ObservationZone[];
}
