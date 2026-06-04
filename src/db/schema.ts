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
  photoUris:   text('photo_uris'),
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
  eventItemId:      text('event_item_id'),
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
  note?: string;
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
  peeHealthZone?:      { emoji: string; label: string; isAlert?: boolean; note?: string } | null;
  poopHealthZone?:     { emoji: string; label: string; isAlert?: boolean; note?: string } | null;
  poopConsistencyZone?:{ emoji: string; label: string; isAlert?: boolean; note?: string } | null;
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

// ─── PLANTILLAS DE EVENTOS (presets reusables) ──────────────────────────────
export const eventPresets = sqliteTable('event_presets', {
  id:                  text('id').primaryKey(),
  eventTypeId:         text('event_type_id').notNull().references(() => eventTypes.id),
  name:                text('name').notNull(),
  emoji:               text('emoji').default('📌'),
  defaultValues:       text('default_values').default('{}'),  // JSON: metricId → value
  defaultUnitOverrides:text('default_unit_overrides').default('{}'), // JSON: metricId → unitId
  defaultNotes:        text('default_notes'),
  defaultTags:         text('default_tags').default('[]'), // JSON: string[]
  sortOrder:           integer('sort_order').default(0),
  isQuickAction:       integer('is_quick_action', { mode: 'boolean' }).default(false),
  createdAt:           integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type EventPreset = typeof eventPresets.$inferSelect;

// ─── CATÁLOGO UNIFICADO (reemplaza event_types + event_presets) ──────────
export const catalogItems = sqliteTable('catalog_items', {
  id:                  text('id').primaryKey(),
  category:            text('category', {
                         enum: ['diaper', 'feeding', 'health', 'growth', 'milestones', 'other'],
                       }).notNull(),
  parentId:            text('parent_id'),
  name:                text('name').notNull(),
  emoji:               text('emoji').default('📌'),
  metrics:             text('metrics').default('[]'), // JSON: EventMetric[]
  defaultValues:       text('default_values').default('{}'),
  defaultUnitOverrides:text('default_unit_overrides').default('{}'),
  defaultNotes:        text('default_notes'),
  defaultTags:         text('default_tags').default('[]'), // JSON: string[]
  isSystem:            integer('is_system', { mode: 'boolean' }).default(false),
  isQuickAction:       integer('is_quick_action', { mode: 'boolean' }).default(false),
  sortOrder:           integer('sort_order').default(0),
  createdAt:           integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type CatalogItem = typeof catalogItems.$inferSelect;
export const foodCatalog = sqliteTable('food_catalog', {
  id:             text('id').primaryKey(),
  name:           text('name').notNull(),
  emoji:          text('emoji'),
  group:          text('group', { enum: ['fruit', 'vegetable', 'grain', 'protein', 'fat'] }).notNull(),
  subgroup:       text('subgroup', { enum: ['cereal', 'tuber', 'animal', 'dairy', 'legume', 'vegetable_protein', 'oil', 'seed', 'nut_butter'] }),
  property:       text('property', { enum: ['laxative', 'astringent', 'both', 'neutral'] }).default('neutral'),
  effect:         text('effect', { enum: ['laxative', 'astringent', 'regulator'] }),
  allergens:      text('allergens'),
  isAllergen:     integer('is_allergen', { mode: 'boolean' }).default(false),
  allergenDetails: text('allergen_details'),
  warning:        text('warning'),
  warningType:    text('warning_type', { enum: ['nitrates', 'choking', 'vitamin_a', 'paste', 'age_restriction'] }),
  secondaryGroups: text('secondary_groups'), // comma-separated additional groups
  isSystem:       integer('is_system', { mode: 'boolean' }).default(true),
  hidden:         integer('hidden', { mode: 'boolean' }).default(false),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── REGISTRO DE ALIMENTACIÓN COMPLEMENTARIA ────────────────────────────────────
export const foodLogs = sqliteTable('food_logs', {
  id:        text('id').primaryKey(),
  babyId:    text('baby_id').notNull(),
  profileId: text('profile_id').notNull(),
  foodId:    text('food_id').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  isFirst:   integer('is_first', { mode: 'boolean' }).default(false),
  reaction:  text('reaction'),
  photoUri:  text('photo_uri'),
  notes:     text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export interface FoodItem {
  id: string;
  name: string;
  emoji: string | null;
  group: 'fruit' | 'vegetable' | 'protein' | 'grain' | 'dairy' | 'legume' | 'cereal_tuber' | 'healthy_fats' | 'animal_protein' | 'vegetable_protein';
  property: 'laxative' | 'astringent' | 'both' | 'neutral' | null;
  effect: 'laxative' | 'astringent' | 'regulator' | null;
  allergens: string | null;
  isAllergen: boolean | null;
  allergenDetails: string | null;
  warning: string | null;
  warningType: 'nitrates' | 'choking' | 'vitamin_a' | 'paste' | 'age_restriction' | null;
  secondaryGroups: string | null;
  isSystem: boolean | null;
  hidden: boolean | null;
}

export interface FoodLog {
  id: string;
  babyId: string;
  profileId: string;
  foodId: string;
  timestamp: Date;
  isFirst: boolean | null;
  reaction: string | null;
  photoUri: string | null;
  notes: string | null;
}
