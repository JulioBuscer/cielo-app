import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { generateId } from '@/src/utils/id';

const sqliteDb = SQLite.openDatabaseSync('cielo.db');
export const db = drizzle(sqliteDb, { schema });

// ─── DATOS DEFAULT ────────────────────────────────────────────────────────────

const DEFAULT_EVENT_TYPES = [
  { id: 'diaper',        emoji: '🍑', label: 'Pañal',         category: 'diaper'  as const, isSystem: true },
  { id: 'burp',          emoji: '💨', label: 'Eructo',         category: 'feeding' as const, isSystem: true },
  { id: 'regurgitation', emoji: '🤧', label: 'Regurgitación',  category: 'health'  as const, isSystem: true },
  { id: 'vomit',         emoji: '🤮', label: 'Vómito',         category: 'health'  as const, isSystem: true },
  { id: 'medication',    emoji: '💊', label: 'Medicamento',    category: 'health'  as const, isSystem: true },
  { id: 'weight',        emoji: '⚖️', label: 'Peso',           category: 'growth'  as const, isSystem: true },
  { id: 'height',        emoji: '📏', label: 'Estatura',       category: 'growth'  as const, isSystem: true },
  { id: 'temperature',   emoji: '🌡️', label: 'Temperatura',   category: 'health'  as const, isSystem: true },
  { id: 'note',          emoji: '📝', label: 'Nota',           category: 'other'   as const, isSystem: true },
];

const DEFAULT_DIAPER_OBSERVATIONS = [
  { id: 'blood',    emoji: '🩸', label: 'Sangre',    isSystem: true },
  { id: 'mucus',    emoji: '🤧', label: 'Mucosidad', isSystem: true },
  { id: 'diarrhea', emoji: '⚠️', label: 'Diarrea',  isSystem: true },
  { id: 'green',    emoji: '🟢', label: 'Verde',     isSystem: true },
  { id: 'lumpy',    emoji: '☁️', label: 'Grumoso',  isSystem: true },
];

// ─── MIGRACIÓN / SETUP ────────────────────────────────────────────────────────

export async function runMigrations() {
  await sqliteDb.execAsync(`PRAGMA journal_mode = WAL;`);
  await sqliteDb.execAsync(`PRAGMA foreign_keys = ON;`);

  // Crear tablas
  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar_uri TEXT,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS babies (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      birth_date INTEGER NOT NULL,
      photo_uri TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_types (
      id TEXT PRIMARY KEY NOT NULL,
      emoji TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      is_system INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diaper_observations (
      id TEXT PRIMARY KEY NOT NULL,
      emoji TEXT NOT NULL,
      label TEXT NOT NULL,
      is_system INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feeding_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      type TEXT NOT NULL,
      bottle_subtype TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_sec INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feeding_status_events (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL REFERENCES feeding_sessions(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      feeding_session_id TEXT REFERENCES feeding_sessions(id),
      event_type_id TEXT NOT NULL REFERENCES event_types(id),
      timestamp INTEGER NOT NULL,
      notes TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Seed event_types (solo si no existen)
  const now = new Date();
  for (const et of DEFAULT_EVENT_TYPES) {
    await sqliteDb.execAsync(`
      INSERT OR IGNORE INTO event_types (id, emoji, label, category, is_system, created_at)
      VALUES ('${et.id}', '${et.emoji}', '${et.label}', '${et.category}', 1, ${now.getTime()});
    `);
  }

  // Seed diaper_observations (solo si no existen)
  for (const obs of DEFAULT_DIAPER_OBSERVATIONS) {
    await sqliteDb.execAsync(`
      INSERT OR IGNORE INTO diaper_observations (id, emoji, label, is_system, created_at)
      VALUES ('${obs.id}', '${obs.emoji}', '${obs.label}', 1, ${now.getTime()});
    `);
  }
}

// ─── HELPERS DE SESIÓN DE TOMA ────────────────────────────────────────────────

/** Calcula la duración total en segundos de una sesión sumando intervalos activos */
export function calcDurationSec(
  statusEvents: Array<{ type: string; timestamp: Date | number }>
): number {
  let total = 0;
  let lastStart: number | null = null;

  for (const ev of statusEvents) {
    const ts = ev.timestamp instanceof Date ? ev.timestamp.getTime() : ev.timestamp;
    if (ev.type === 'start' || ev.type === 'resume') {
      lastStart = ts;
    } else if ((ev.type === 'pause' || ev.type === 'finish') && lastStart !== null) {
      total += (ts - lastStart) / 1000;
      lastStart = null;
    }
  }

  return Math.round(total);
}

/** Formatea segundos como "X min Y seg" o "Xh Ym" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}
