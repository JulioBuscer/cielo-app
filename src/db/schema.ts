import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

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

// ─── REGISTROS DE PAÑAL ───────────────────────────────────────────────────────
export const diaperLogs = sqliteTable('diaper_logs', {
  id:            text('id').primaryKey(),
  babyId:        text('baby_id').notNull().references(() => babies.id),
  profileId:     text('profile_id').notNull().references(() => profiles.id),
  timestamp:     integer('timestamp', { mode: 'timestamp' }).notNull(),
  peeIntensity:  integer('pee_intensity').default(0),   // 0 = no hubo
  poopIntensity: integer('poop_intensity').default(0),  // 0 = no hubo
  hasBlood:      integer('has_blood', { mode: 'boolean' }).default(false),
  hasMucus:      integer('has_mucus', { mode: 'boolean' }).default(false),
  hasDiarrhea:   integer('has_diarrhea', { mode: 'boolean' }).default(false),
  color:         text('color'),        // 'amarillo','verde','café','negro','rojo'
  consistency:   text('consistency'), // 'líquida','pastosa','sólida','granulada'
  imageUri:      text('image_uri'),
  imageThumbUri: text('image_thumb_uri'),
  notes:         text('notes'),
});

// ─── REGISTROS DE ALIMENTACIÓN ────────────────────────────────────────────────
export const feedingLogs = sqliteTable('feeding_logs', {
  id:          text('id').primaryKey(),
  babyId:      text('baby_id').notNull().references(() => babies.id),
  profileId:   text('profile_id').notNull().references(() => profiles.id),
  timestamp:   integer('timestamp', { mode: 'timestamp' }).notNull(),
  type:        text('type', {
                 enum: ['breast_left', 'breast_right', 'formula', 'mixed']
               }).notNull(),
  durationMin: integer('duration_min'),  // Para lactancia (minutos)
  amountMl:    real('amount_ml'),        // Para fórmula (ml)
  notes:       text('notes'),
});

// ─── REGISTROS DE CRECIMIENTO ─────────────────────────────────────────────────
// Peso en gramos (ej: 3500 = 3.5 kg) — entero para evitar errores de punto flotante
// Altura en milímetros (ej: 500 = 50.0 cm) — mismo motivo
// La UI muestra kg/cm con conversión, pero la DB guarda enteros exactos
export const growthLogs = sqliteTable('growth_logs', {
  id:           text('id').primaryKey(),
  babyId:       text('baby_id').notNull().references(() => babies.id),
  profileId:    text('profile_id').notNull().references(() => profiles.id),
  timestamp:    integer('timestamp', { mode: 'timestamp' }).notNull(),
  weightGrams:  integer('weight_grams'),    // null si solo se midió estatura
  heightMm:     integer('height_mm'),       // null si solo se pesó
  headCircMm:   integer('head_circ_mm'),    // Circunferencia cefálica (opcional)
  notes:        text('notes'),
});

// ─── TIPOS DERIVADOS ──────────────────────────────────────────────────────────
export type Profile    = typeof profiles.$inferSelect;
export type Baby       = typeof babies.$inferSelect;
export type DiaperLog  = typeof diaperLogs.$inferSelect;
export type FeedingLog = typeof feedingLogs.$inferSelect;
export type GrowthLog  = typeof growthLogs.$inferSelect;

export type NewDiaperLog  = typeof diaperLogs.$inferInsert;
export type NewFeedingLog = typeof feedingLogs.$inferInsert;
export type NewGrowthLog  = typeof growthLogs.$inferInsert;
