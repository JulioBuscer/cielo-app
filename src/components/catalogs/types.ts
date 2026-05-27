export type Zone = {
  min: number;
  max: number;
  color: string;
  label: string;
  emoji?: string;
  isAlert?: boolean;
  note?: string;
};

export type ConfigRange = { min: number; max: number };

export type HealthConfig = { enabled: boolean; min: number; max: number; zones: Zone[] };
