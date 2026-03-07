import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { generateId } from '@/src/utils/id';

// ─── SINGLETON LAZY ───────────────────────────────────────────────────────────
// NO inicializar aquí — con New Architecture (JSI) el nativo aún no está listo
// en import-time. La DB se crea dentro de runMigrations() y se expone via getDb().

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _raw: SQLite.SQLiteDatabase | null = null;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    throw new Error(
      '[Cielo] getDb() llamado antes de runMigrations(). ' +
      'Asegúrate de que _layout.tsx espere a que runMigrations() termine.'
    );
  }
  return _db;
}

// ─── DATOS DEFAULT ────────────────────────────────────────────────────────────

const DEFAULT_EVENT_TYPES = [
  { id: 'diaper',        emoji: '🍑', label: 'Pañal',         category: 'diaper'  as const },
  { id: 'burp',          emoji: '💨', label: 'Eructo',         category: 'feeding' as const },
  { id: 'regurgitation', emoji: '🤧', label: 'Regurgitación',  category: 'health'  as const },
  { id: 'vomit',         emoji: '🤮', label: 'Vómito',         category: 'health'  as const },
  { id: 'medication',    emoji: '💊', label: 'Medicamento',    category: 'health'  as const },
  { id: 'weight',        emoji: '⚖️', label: 'Peso',           category: 'growth'  as const },
  { id: 'height',        emoji: '📏', label: 'Estatura',       category: 'growth'  as const },
  { id: 'temperature',   emoji: '🌡️', label: 'Temperatura',   category: 'health'  as const },
  { id: 'note',          emoji: '📝', label: 'Nota',           category: 'other'   as const },
];

const DEFAULT_DIAPER_OBSERVATIONS = [
  { id: 'blood',    emoji: '🩸', label: 'Sangre'    },
  { id: 'mucus',    emoji: '🤧', label: 'Mucosidad' },
  { id: 'diarrhea', emoji: '⚠️', label: 'Diarrea'   },
  { id: 'green',    emoji: '🟢', label: 'Verde'     },
  { id: 'lumpy',    emoji: '☁️', label: 'Grumoso'   },
];

// ─── MIGRACIÓN / SETUP ────────────────────────────────────────────────────────

export async function runMigrations() {
  // Abrir la DB AQUÍ, no a nivel de módulo
  _raw = SQLite.openDatabaseSync('cielo.db');
  _db  = drizzle(_raw, { schema });

  await _raw.execAsync(`PRAGMA journal_mode = WAL;`);
  await _raw.execAsync(`PRAGMA foreign_keys = ON;`);

  // Detectar schema viejo (sin event_types) y limpiar
  try {
    await _raw.execAsync(`SELECT * FROM event_types LIMIT 1`);
  } catch {
    // Schema viejo → borrar todo y empezar limpio
    await _raw.execAsync(`
      DROP TABLE IF EXISTS diaper_logs;
      DROP TABLE IF EXISTS feeding_logs;
      DROP TABLE IF EXISTS growth_logs;
      DROP TABLE IF EXISTS timeline_events;
      DROP TABLE IF EXISTS feeding_status_events;
      DROP TABLE IF EXISTS feeding_sessions;
      DROP TABLE IF EXISTS diaper_observations;
      DROP TABLE IF EXISTS event_types;
      DROP TABLE IF EXISTS babies;
      DROP TABLE IF EXISTS profiles;
    `);
  }

  // Crear tablas
  await _raw.execAsync(`
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

    CREATE TABLE IF NOT EXISTS sleep_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      status TEXT NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_sec INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sleep_status_events (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL REFERENCES sleep_sessions(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      feeding_session_id TEXT REFERENCES feeding_sessions(id),
      sleep_session_id TEXT REFERENCES sleep_sessions(id),
      event_type_id TEXT NOT NULL REFERENCES event_types(id),
      timestamp INTEGER NOT NULL,
      notes TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Migraciones de columnas
  for (const sql of [
    // babies
    `ALTER TABLE babies ADD COLUMN nickname TEXT`,
    `ALTER TABLE babies ADD COLUMN sex TEXT DEFAULT 'unknown'`,
    `ALTER TABLE babies ADD COLUMN status TEXT DEFAULT 'unknown'`,
    `ALTER TABLE babies ADD COLUMN weight_birth_grams INTEGER`,
    `ALTER TABLE babies ADD COLUMN height_birth_mm INTEGER`,
    `ALTER TABLE babies ADD COLUMN updated_at INTEGER`,
    `ALTER TABLE babies ADD COLUMN avatar_emoji TEXT DEFAULT '\u{1F476}'`,
    // timeline_events
    `ALTER TABLE timeline_events ADD COLUMN sleep_session_id TEXT REFERENCES sleep_sessions(id)`,
  ]) {
    try { await _raw.execAsync(sql); } catch { /* columna ya existe, ok */ }
  }

  // Seed event_types
  const now = Date.now();
  for (const et of DEFAULT_EVENT_TYPES) {
    await _raw.execAsync(
      `INSERT OR IGNORE INTO event_types (id, emoji, label, category, is_system, created_at)
       VALUES ('${et.id}', '${et.emoji}', '${et.label}', '${et.category}', 1, ${now});`
    );
  }

  // Seed diaper_observations
  for (const obs of DEFAULT_DIAPER_OBSERVATIONS) {
    await _raw.execAsync(
      `INSERT OR IGNORE INTO diaper_observations (id, emoji, label, is_system, created_at)
       VALUES ('${obs.id}', '${obs.emoji}', '${obs.label}', 1, ${now});`
    );
  }
}

// ─── RESET TOTAL (solo para desarrollo) ─────────────────────────────────────

export async function resetAllData() {
  if (!_raw) throw new Error('DB no inicializada');

  // 1. Borrar todos los datos (orden inverso por foreign keys)
  await _raw.execAsync(`
    DELETE FROM timeline_events;
    DELETE FROM feeding_status_events;
    DELETE FROM feeding_sessions;
    DELETE FROM sleep_status_events;
    DELETE FROM sleep_sessions;
    DELETE FROM babies;
    DELETE FROM profiles;
  `);

  // 2. Limpiar AsyncStorage (perfil activo, bebé activo, onboarding)
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.multiRemove([
    'active_profile_id',
    'active_baby_id',
    'onboarding_done',
  ]);
}

// ─── HELPERS DE SESIÓN ────────────────────────────────────────────────────────

/** Suma los intervalos activos (start/resume → pause/finish) en segundos */
export function calcDurationSec(
  statusEvents: Array<{ type: string; timestamp: Date | number }>
): number {
  let total = 0;
  let lastStart: number | null = null;

  for (const ev of statusEvents) {
    const ts = ev.timestamp instanceof Date ? ev.timestamp.getTime() : Number(ev.timestamp);
    if (ev.type === 'start' || ev.type === 'resume') {
      lastStart = ts;
    } else if ((ev.type === 'pause' || ev.type === 'finish') && lastStart !== null) {
      total += (ts - lastStart) / 1000;
      lastStart = null;
    }
  }
  return Math.round(total);
}

/** Formatea segundos → "Xs", "Xm Ys", "Xh Ym" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs     = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}
