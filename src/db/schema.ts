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
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  birthDate: integer('birth_date', { mode: 'timestamp' }).notNull(),
  photoUri:  text('photo_uri'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
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
// Una sesión = un evento de alimentación completo (puede durar minutos con pausas)
// Una sola sesión activa/pausada por bebé a la vez
export const feedingSessions = sqliteTable('feeding_sessions', {
  id:             text('id').primaryKey(),
  babyId:         text('baby_id').notNull().references(() => babies.id),
  profileId:      text('profile_id').notNull().references(() => profiles.id), // quien inició
  type:           text('type', {
                    enum: ['breast_left', 'breast_right', 'bottle']
                  }).notNull(),
  bottleSubtype:  text('bottle_subtype', {
                    enum: ['breast_milk', 'formula', 'mixed', 'other']
                  }),                         // solo si type = 'bottle'
  status:         text('status', {
                    enum: ['active', 'paused', 'finished']
                  }).notNull().default('active'),
  startedAt:      integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt:        integer('ended_at', { mode: 'timestamp' }),   // null si no terminó
  durationSec:    integer('duration_sec'),                      // calculado al terminar
  notes:          text('notes'),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── EVENTOS DE ESTADO DE TOMA ────────────────────────────────────────────────
// Cada cambio de estado genera un registro aquí
// profile_id = quién hizo el cambio (auditoría)
export const feedingStatusEvents = sqliteTable('feeding_status_events', {
  id:          text('id').primaryKey(),
  sessionId:   text('session_id').notNull().references(() => feedingSessions.id),
  profileId:   text('profile_id').notNull().references(() => profiles.id),
  type:        text('type', {
                 enum: ['start', 'pause', 'resume', 'finish']
               }).notNull(),
  timestamp:   integer('timestamp', { mode: 'timestamp' }).notNull(),
});

// ─── EVENTOS DE TIMELINE ──────────────────────────────────────────────────────
// TODO lo que sucede queda aquí: pañales, eructos, medicamentos, peso, notas, etc.
// Pueden estar o no vinculados a una sesión de toma
export const timelineEvents = sqliteTable('timeline_events', {
  id:               text('id').primaryKey(),
  babyId:           text('baby_id').notNull().references(() => babies.id),
  profileId:        text('profile_id').notNull().references(() => profiles.id),
  feedingSessionId: text('feeding_session_id').references(() => feedingSessions.id), // nullable
  eventTypeId:      text('event_type_id').notNull().references(() => eventTypes.id),
  timestamp:        integer('timestamp', { mode: 'timestamp' }).notNull(),
  notes:            text('notes'),
  metadata:         text('metadata'),   // JSON string con datos extra según tipo
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ─── TIPOS DERIVADOS ──────────────────────────────────────────────────────────
export type Profile           = typeof profiles.$inferSelect;
export type Baby              = typeof babies.$inferSelect;
export type EventType         = typeof eventTypes.$inferSelect;
export type DiaperObservation = typeof diaperObservations.$inferSelect;
export type FeedingSession    = typeof feedingSessions.$inferSelect;
export type FeedingStatusEvent = typeof feedingStatusEvents.$inferSelect;
export type TimelineEvent     = typeof timelineEvents.$inferSelect;

export type NewFeedingSession    = typeof feedingSessions.$inferInsert;
export type NewFeedingStatusEvent = typeof feedingStatusEvents.$inferInsert;
export type NewTimelineEvent     = typeof timelineEvents.$inferInsert;

// ─── METADATA TIPADA POR EVENTO ───────────────────────────────────────────────
export interface DiaperMetadata {
  peeIntensity:    number;   // 0-5
  poopIntensity:   number;   // 0-5
  observationIds:  string[]; // IDs de diaper_observations
  imageUri?:       string;
  imageThumbUri?:  string;
}

export interface MedicationMetadata {
  medicineName: string;
  dose?:        string;
}

export interface GrowthMetadata {
  weightGrams?: number;   // null si solo estatura
  heightMm?:    number;   // null si solo peso
  headCircMm?:  number;   // opcional siempre
}

export interface TemperatureMetadata {
  celsius: number;
}
