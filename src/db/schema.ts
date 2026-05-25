import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── PERFILES DE CUIDADORES ───────────────────────────────────────────────────
export const profiles = sqliteTable('profiles', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  role:      text('role', {
               enum: ['mama', 'papa', 'abue', 'nanny', 'bestie']
             }).notNull(),
  avatarUri: text('avatar_uri'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── PERFIL DEL BEBÉ ──────────────────────────────────────────────────────────
export const babies = sqliteTable('babies', {
  id:               text('id').primaryKey(),
  name:             text('name').notNull(),
  nickname:         text('nickname'),
  avatarEmoji:      text('avatar_emoji').default('👶'),   // emoji elegido por el usuario
  birthDate:        integer('birth_date', { mode: 'timestamp' }).notNull(),
  sex:              text('sex', { enum: ['male', 'female', 'unknown'] }).default('unknown'),
  status:           text('status', { enum: ['healthy', 'sick', 'unknown'] }).default('unknown'),
  weightBirthGrams: integer('weight_birth_grams'),
  heightBirthMm:    integer('height_birth_mm'),
  photoUri:         text('photo_uri'),
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:        integer('updated_at', { mode: 'timestamp' }),
});

// ─── CATÁLOGO DE TIPOS DE EVENTO (default + custom) ───────────────────────────
export const eventTypes = sqliteTable('event_types', {
  id:        text('id').primaryKey(),
  emoji:     text('emoji').notNull(),
  label:     text('label').notNull(),
  category:  text('category', {
               enum: ['diaper', 'feeding', 'health', 'growth', 'other']
             }).notNull(),
  isSystem:  integer('is_system', { mode: 'boolean' }).default(false),
  metrics:   text('metrics').default('[]'), // JSON: EventMetric[]
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── CATÁLOGO DE OBSERVACIONES DE PAÑAL (default + custom) ────────────────────
export const diaperObservations = sqliteTable('diaper_observations', {
  id:        text('id').primaryKey(),
  emoji:     text('emoji').notNull(),
  label:     text('label').notNull(),
  isSystem:  integer('is_system', { mode: 'boolean' }).default(false),
  isAlert:   integer('is_alert', { mode: 'boolean' }).default(false),
  scaleMin:  integer('scale_min'),       // ⚠️ deprecated — usar metrics
  scaleMax:  integer('scale_max'),       // ⚠️ deprecated — usar metrics
  zones:     text('zones'),              // ⚠️ deprecated — usar metrics
  metrics:   text('metrics').default('[]'), // JSON: ObservationMetric[]
  sortOrder: integer('sort_order').default(0),
  active:    integer('active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── SESIONES DE TOMA ─────────────────────────────────────────────────────────
export const feedingSessions = sqliteTable('feeding_sessions', {
  id:             text('id').primaryKey(),
  babyId:         text('baby_id').notNull().references(() => babies.id),
  profileId:      text('profile_id').notNull().references(() => profiles.id),
  type:           text('type', {
                    enum: ['breast_left', 'breast_right', 'bottle']
                  }).notNull(),
  bottleSubtype:  text('bottle_subtype', {
                    enum: ['breast_milk', 'formula', 'mixed', 'other']
                  }),
  status:         text('status', {
                    enum: ['active', 'paused', 'finished']
                  }).notNull().default('active'),
  startedAt:      integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt:        integer('ended_at', { mode: 'timestamp' }),
  durationSec:    integer('duration_sec'),
  notes:          text('notes'),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── EVENTOS DE ESTADO DE TOMA ────────────────────────────────────────────────
export const feedingStatusEvents = sqliteTable('feeding_status_events', {
  id:          text('id').primaryKey(),
  sessionId:   text('session_id').notNull().references(() => feedingSessions.id),
  profileId:   text('profile_id').notNull().references(() => profiles.id),
  type:        text('type', {
                 enum: ['start', 'pause', 'resume', 'finish']
               }).notNull(),
  timestamp:   integer('timestamp', { mode: 'timestamp' }).notNull(),
});

// ─── REGISTRO DE CRECIMIENTO ───────────────────────────────────────────────────
export const growthLogs = sqliteTable('growth_logs', {
  id:          text('id').primaryKey(),
  babyId:      text('baby_id').notNull().references(() => babies.id),
  profileId:   text('profile_id').notNull().references(() => profiles.id),
  timestamp:   integer('timestamp', { mode: 'timestamp' }).notNull(),
  weightGrams: integer('weight_grams'),
  heightMm:    integer('height_mm'),
  headCircMm:  integer('head_circ_mm'),
  notes:       text('notes'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── SESIONES DE SUEÑO ────────────────────────────────────────────────────────
// Independientes de las tomas — el bebé puede comer y dormir al mismo tiempo.
// Una sola sesión activa/pausada por bebé a la vez.
export const sleepSessions = sqliteTable('sleep_sessions', {
  id:          text('id').primaryKey(),
  babyId:      text('baby_id').notNull().references(() => babies.id),
  profileId:   text('profile_id').notNull().references(() => profiles.id),
  status:      text('status', {
                 enum: ['active', 'paused', 'finished']
               }).notNull().default('active'),
  startedAt:   integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt:     integer('ended_at', { mode: 'timestamp' }),
  durationSec: integer('duration_sec'),
  notes:       text('notes'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── EVENTOS DE ESTADO DE SUEÑO ───────────────────────────────────────────────
export const sleepStatusEvents = sqliteTable('sleep_status_events', {
  id:        text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sleepSessions.id),
  profileId: text('profile_id').notNull().references(() => profiles.id),
  type:      text('type', {
               enum: ['start', 'pause', 'resume', 'finish']
             }).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

// ─── EVENTOS DE TIMELINE ──────────────────────────────────────────────────────
export const timelineEvents = sqliteTable('timeline_events', {
  id:               text('id').primaryKey(),
  babyId:           text('baby_id').notNull().references(() => babies.id),
  profileId:        text('profile_id').notNull().references(() => profiles.id),
  feedingSessionId: text('feeding_session_id').references(() => feedingSessions.id),
  sleepSessionId:   text('sleep_session_id').references(() => sleepSessions.id),
  eventTypeId:      text('event_type_id').notNull().references(() => eventTypes.id),
  timestamp:        integer('timestamp', { mode: 'timestamp' }).notNull(),
  notes:            text('notes'),
  metadata:         text('metadata'),
  values:           text('values').default('{}'), // JSON: Record<string, number>
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── TIPOS DERIVADOS ──────────────────────────────────────────────────────────
export type Profile             = typeof profiles.$inferSelect;
export type Baby                = typeof babies.$inferSelect;
export type EventType           = typeof eventTypes.$inferSelect;
export type DiaperObservation   = typeof diaperObservations.$inferSelect;
export type FeedingSession      = typeof feedingSessions.$inferSelect;
export type FeedingStatusEvent  = typeof feedingStatusEvents.$inferSelect;
export type GrowthLog           = typeof growthLogs.$inferSelect;
export type SleepSession        = typeof sleepSessions.$inferSelect;
export type SleepStatusEvent    = typeof sleepStatusEvents.$inferSelect;
export type TimelineEvent       = typeof timelineEvents.$inferSelect;

// ─── OBSERVATION METRICS ──────────────────────────────────────────────────────
export interface ObservationZone {
  min: number;
  max: number;
  color: string;
  label: string;
  emoji: string;
}

export interface ObservationMetric {
  id: string;
  name: string;
  scaleMin: number;
  scaleMax: number;
  zones: ObservationZone[];
}

export function parseMetrics(json: string | null): ObservationMetric[] {
  if (!json) return [];
  try { return JSON.parse(json) as ObservationMetric[]; } catch { return []; }
}

export function getMetricZoneColor(metric: ObservationMetric, value: number): string {
  for (const z of metric.zones) {
    if (value >= z.min && value <= z.max) return z.color;
  }
  return '#888';
}

export function getMetricZoneLabel(metric: ObservationMetric, value: number): string | null {
  for (const z of metric.zones) {
    if (value >= z.min && value <= z.max) return z.label;
  }
  return null;
}

export function getMetricZoneEmoji(metric: ObservationMetric, value: number): string | null {
  for (const z of metric.zones) {
    if (value >= z.min && value <= z.max) return z.emoji;
  }
  return null;
}

// ─── METADATA TIPADA POR EVENTO ───────────────────────────────────────────────
export interface DiaperZone {
  min: number;
  max: number;
  color: string;
  label: string;
  isAlert?: boolean;
}

export interface DiaperMetadata {
  peeIntensity:        number;
  poopIntensity:       number;
  peeHealth:           number | null;           // pipímetro
  poopHealth:          number | null;           // popómetro
  poopConsistency:     number;
  peeIntensityZone?:   { emoji: string; label: string } | null;
  poopIntensityZone?:  { emoji: string; label: string } | null;
  peeHealthZone?:      { emoji: string; label: string; isAlert?: boolean } | null;
  poopHealthZone?:     { emoji: string; label: string; isAlert?: boolean } | null;
  poopConsistencyZone?:{ emoji: string; label: string; isAlert?: boolean } | null;
  peeHealthAlert?:     boolean;
  poopHealthAlert?:    boolean;
  poopConsistencyAlert?: boolean;
  observationIds:      string[];                // tags simples sin métricas
  observationValues:   Record<string, Record<string, number>> | null;  // { obsId: { metricId: valor } }
  imageUri?:           string;
  weightGrams?:        number;
}

export function getZoneColor(zonesJson: string | null, value: number): string {
  if (!zonesJson) return '#888';
  try {
    const zones: DiaperZone[] = JSON.parse(zonesJson);
    for (const z of zones) {
      if (value >= z.min && value <= z.max) return z.color;
    }
  } catch {}
  return '#888';
}

export function getZoneLabel(zonesJson: string | null, value: number): string | null {
  if (!zonesJson) return null;
  try {
    const zones: DiaperZone[] = JSON.parse(zonesJson);
    for (const z of zones) {
      if (value >= z.min && value <= z.max) return z.label;
    }
  } catch {}
  return null;
}

export interface MedicationMetadata {
  medicineName: string;
  dose?:        string;
}

export interface GrowthMetadata {
  weightGrams?: number;
  heightMm?:    number;
  headCircMm?:  number;
}

export interface TemperatureMetadata {
  celsius: number;
}
