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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── CATÁLOGO DE OBSERVACIONES DE PAÑAL (default + custom) ────────────────────
export const diaperObservations = sqliteTable('diaper_observations', {
  id:        text('id').primaryKey(),
  emoji:     text('emoji').notNull(),
  label:     text('label').notNull(),
  isSystem:  integer('is_system', { mode: 'boolean' }).default(false),
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
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── TIPOS DERIVADOS ──────────────────────────────────────────────────────────
export type Profile             = typeof profiles.$inferSelect;
export type Baby                = typeof babies.$inferSelect;
export type EventType           = typeof eventTypes.$inferSelect;
export type DiaperObservation   = typeof diaperObservations.$inferSelect;
export type FeedingSession      = typeof feedingSessions.$inferSelect;
export type FeedingStatusEvent  = typeof feedingStatusEvents.$inferSelect;
export type SleepSession        = typeof sleepSessions.$inferSelect;
export type SleepStatusEvent    = typeof sleepStatusEvents.$inferSelect;
export type TimelineEvent       = typeof timelineEvents.$inferSelect;

// ─── METADATA TIPADA POR EVENTO ───────────────────────────────────────────────
export interface DiaperMetadata {
  peeIntensity:   number;
  poopIntensity:  number;
  observationIds: string[];
  imageUri?:      string;
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
