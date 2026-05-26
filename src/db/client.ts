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
  { id: 'measurement',   emoji: '📏', label: 'Medición',       category: 'growth'  as const },
  { id: 'note',          emoji: '📝', label: 'Nota',           category: 'other'   as const },
];

const DEFAULT_DIAPER_OBSERVATIONS = [
  {
    id: 'blood',    emoji: '🩸', label: 'Sangre',    isAlert: true,
    metrics: JSON.stringify([
      { id: 'intensity', name: 'Intensidad', scaleMin: 1, scaleMax: 3,
        zones: [
          { min: 1, max: 1, color: '#FF9800', label: 'Puntito',   emoji: '🩸' },
          { min: 2, max: 2, color: '#FF5722', label: 'Hilito',    emoji: '🩸' },
          { min: 3, max: 3, color: '#D32F2F', label: 'Abundante', emoji: '🚨' },
        ] },
    ]),
  },
  {
    id: 'mucus',    emoji: '🤧', label: 'Mucosidad', isAlert: true,
    metrics: JSON.stringify([
      { id: 'default', name: 'Cantidad', scaleMin: 1, scaleMax: 4,
        zones: [
          { min: 1, max: 1, color: '#C8E6C9', label: 'Mínima',  emoji: '🔬' },
          { min: 2, max: 2, color: '#FFE082', label: 'Poca',     emoji: '🤧' },
          { min: 3, max: 3, color: '#FFB74D', label: 'Moderada', emoji: '😷' },
          { min: 4, max: 4, color: '#EF5350', label: 'Excesiva', emoji: '💦' },
        ] },
    ]),
  },
  {
    id: 'diarrhea', emoji: '⚠️', label: 'Diarrea',   isAlert: true,
    metrics: JSON.stringify([
      { id: 'default', name: 'Consistencia', scaleMin: 1, scaleMax: 5,
        zones: [
          { min: 1,  max: 2,  color: '#FFC107', label: 'Blanda',     emoji: '💩' },
          { min: 3,  max: 5,  color: '#F44336', label: 'Acuosa',     emoji: '💧' },
        ] },
    ]),
  },
  { id: 'green',    emoji: '🟢', label: 'Verde',     isAlert: false, metrics: '[]' },
  { id: 'lumpy',    emoji: '☁️', label: 'Grumoso',   isAlert: false, metrics: '[]' },
];

// ─── MIGRACIÓN / SETUP ────────────────────────────────────────────────────────

export async function runMigrations() {
  // Abrir la DB AQUÍ, no a nivel de módulo
  _raw = SQLite.openDatabaseSync('cielo.db');
  _db  = drizzle(_raw, { schema });

  await _raw.execAsync(`PRAGMA journal_mode = WAL;`);
  await _raw.execAsync(`PRAGMA foreign_keys = ON;`);

  // Crear tablas una por una (evita NullPointerException en Android con execAsync multi-statement)
  const CREATE_TABLES = [
    `CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar_uri TEXT,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS babies (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      birth_date INTEGER NOT NULL,
      photo_uri TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS event_types (
      id TEXT PRIMARY KEY NOT NULL,
      emoji TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      is_system INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS diaper_observations (
      id TEXT PRIMARY KEY NOT NULL,
      emoji TEXT NOT NULL,
      label TEXT NOT NULL,
      is_system INTEGER DEFAULT 0,
      scale_min INTEGER,
      scale_max INTEGER,
      zones TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS feeding_sessions (
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
    )`,
    `CREATE TABLE IF NOT EXISTS feeding_status_events (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL REFERENCES feeding_sessions(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sleep_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      status TEXT NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_sec INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sleep_status_events (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL REFERENCES sleep_sessions(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS growth_logs (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      timestamp INTEGER NOT NULL,
      weight_grams INTEGER,
      height_mm INTEGER,
      head_circ_mm INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      feeding_session_id TEXT REFERENCES feeding_sessions(id),
      sleep_session_id TEXT REFERENCES sleep_sessions(id),
      event_type_id TEXT NOT NULL REFERENCES event_types(id),
      timestamp INTEGER NOT NULL,
      notes TEXT,
      metadata TEXT,
      "values" TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS food_catalog (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT,
      "group" TEXT NOT NULL,
      property TEXT DEFAULT 'neutral',
      allergens TEXT,
      is_system INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS food_logs (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      food_id TEXT NOT NULL REFERENCES food_catalog(id),
      timestamp INTEGER NOT NULL,
      is_first INTEGER DEFAULT 0,
      reaction TEXT,
      photo_uri TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL
    )`,
  ];
  for (const sql of CREATE_TABLES) {
    await _raw.execAsync(sql);
  }

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
    // diaper_observations
    `ALTER TABLE diaper_observations ADD COLUMN scale_min INTEGER`,
    `ALTER TABLE diaper_observations ADD COLUMN scale_max INTEGER`,
    `ALTER TABLE diaper_observations ADD COLUMN zones TEXT`,
    `ALTER TABLE diaper_observations ADD COLUMN is_alert INTEGER DEFAULT 0`,
    `ALTER TABLE diaper_observations ADD COLUMN metrics TEXT DEFAULT '[]'`,
    `ALTER TABLE diaper_observations ADD COLUMN sort_order INTEGER DEFAULT 0`,
    `ALTER TABLE diaper_observations ADD COLUMN active INTEGER DEFAULT 1`,
    // event_types
    `ALTER TABLE event_types ADD COLUMN metrics TEXT DEFAULT '[]'`,
    // timeline_events
    `ALTER TABLE timeline_events ADD COLUMN "values" TEXT DEFAULT '{}'`,
  ]) {
    try { await _raw.execAsync(sql); } catch { /* columna ya existe, ok */ }
  }

  // Migrar datos viejos: scale_min/scale_max/zones → metrics
  await _raw.execAsync(`
    UPDATE diaper_observations
    SET metrics = CASE
      WHEN scale_min IS NOT NULL AND metrics = '[]' THEN
        json_array(json_object(
          'id', 'default',
          'name', 'default',
          'scaleMin', scale_min,
          'scaleMax', scale_max,
          'zones', coalesce(nullif(zones, ''), '[]')
        ))
      ELSE metrics
    END
    WHERE scale_min IS NOT NULL AND (metrics IS NULL OR metrics = '[]');
  `);

  // Seed event_types
  const now = Date.now();
  for (const et of DEFAULT_EVENT_TYPES) {
    await _raw.execAsync(
      `INSERT OR IGNORE INTO event_types (id, emoji, label, category, is_system, created_at)
       VALUES ('${et.id}', '${et.emoji}', '${et.label}', '${et.category}', 1, ${now});`
    );
  }

  // Seed metrics for system event types
  const METRICS_MAP: Record<string, string> = {
    measurement: JSON.stringify([
      { id: 'weightKg', name: 'Peso', unitId: 'kilogram', scaleMin: 0, scaleMax: 30 },
      { id: 'heightCm', name: 'Estatura', unitId: 'centimeter', scaleMin: 0, scaleMax: 120 },
      { id: 'headCircCm', name: 'C. Cefálico', unitId: 'centimeter', scaleMin: 0, scaleMax: 60 },
    ]),
    weight: JSON.stringify([
      { id: 'weight', name: 'Peso', unitId: 'kilogram', scaleMin: 0, scaleMax: 30 },
    ]),
    height: JSON.stringify([
      { id: 'height', name: 'Estatura', unitId: 'centimeter', scaleMin: 0, scaleMax: 120 },
    ]),
    temperature: JSON.stringify([
      { id: 'temperature', name: 'Temperatura', unitId: 'celsius', scaleMin: 34, scaleMax: 42 },
    ]),
    medication: JSON.stringify([
      { id: 'dose', name: 'Dosis', unitId: 'milliliter', scaleMin: 0, scaleMax: 100 },
    ]),
  };
  for (const [id, metrics] of Object.entries(METRICS_MAP)) {
    await _raw.execAsync(
      `UPDATE event_types SET metrics = '${metrics}' WHERE id = '${id}' AND (metrics IS NULL OR metrics = '[]');`
    );
  }

  // Migrate legacy metadata → values
  const LEGACY_MIGRATIONS = [
    {
      typeId: 'weight',
      field: 'weightGrams',
      metricId: 'weight',
      divisor: 1000,
    },
    {
      typeId: 'height',
      field: 'heightMm',
      metricId: 'height',
      divisor: 10,
    },
    {
      typeId: 'temperature',
      field: 'celsius',
      metricId: 'temperature',
      divisor: 1,
    },
  ];
  for (const { typeId, field, metricId, divisor } of LEGACY_MIGRATIONS) {
    await _raw.execAsync(`
      UPDATE timeline_events
      SET "values" = json_object(
        '${metricId}',
        CAST(json_extract(metadata, '$.${field}') AS REAL) / ${divisor}
      )
      WHERE event_type_id = '${typeId}'
        AND metadata IS NOT NULL
        AND json_extract(metadata, '$.${field}') IS NOT NULL
        AND ("values" IS NULL OR "values" = '{}');
    `);
  }

  // Migrate legacy weight/height events → unified measurement
  try {
    await migrateToMeasurement(_raw);
  } catch (e) {
    console.error('[Cielo] Measurement migration error:', e);
  }

  // Seed/update diaper_observations (no-destructivo: actualiza system, ignora custom)
  for (const obs of DEFAULT_DIAPER_OBSERVATIONS) {
    const isAlert = obs.isAlert ? 1 : 0;
    // Actualizar métricas de observaciones system existentes
    await _raw.execAsync(
      `UPDATE diaper_observations SET emoji='${obs.emoji}', label='${obs.label}', is_alert=${isAlert}, metrics='${obs.metrics}'
       WHERE id='${obs.id}' AND is_system=1;`
    );
    // Insertar si no existe (nuevas observaciones system)
    await _raw.execAsync(
      `INSERT OR IGNORE INTO diaper_observations (id, emoji, label, is_system, is_alert, metrics, sort_order, active, created_at)
       VALUES ('${obs.id}', '${obs.emoji}', '${obs.label}', 1, ${isAlert}, '${obs.metrics}', 0, 1, ${now});`
    );
  }

  // Seed food catalog
  const { seedFoodCatalog } = await import('@/src/hooks/useFoodLogs');
  try { seedFoodCatalog(); } catch (e) { console.error('[Cielo] Food seed error:', e); }
}

// ─── MIGRACIÓN: weight/height → measurement ─────────────────────────────────────

async function migrateToMeasurement(_raw: SQLite.SQLiteDatabase) {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const done = await AsyncStorage.getItem('migration_measurement_done');
  if (done === 'true') return;

  // 1. Birth weight from baby profile → measurement event
  const babies: any[] = _raw.getAllSync(`SELECT id, weight_birth_grams, birth_date FROM babies WHERE weight_birth_grams IS NOT NULL;`);
  for (const baby of babies) {
    const birthDate = new Date(baby.birth_date);
    const birthWeightGrams = baby.weight_birth_grams;
    const existing: any[] = _raw.getAllSync(
      `SELECT id FROM timeline_events WHERE baby_id = ? AND event_type_id = 'measurement' AND timestamp = ? LIMIT 1;`,
      [baby.id, birthDate.getTime()]
    );
    if (existing.length === 0) {
      // Use first available profile to satisfy FK
      const profiles: any[] = _raw.getAllSync(`SELECT id FROM profiles LIMIT 1;`);
      const profileId = profiles.length > 0 ? profiles[0].id : 'system';
      _raw.execSync(
        `INSERT INTO timeline_events (id, baby_id, profile_id, event_type_id, timestamp, "values", created_at)
         VALUES ('${generateId()}', '${baby.id}', '${profileId}', 'measurement', ${birthDate.getTime()},
         '${JSON.stringify({ weightKg: birthWeightGrams / 1000 })}', ${Date.now()});`
      );
    }
  }

  // 2. Read all weight/height events, ordered by timestamp
  const events: any[] = _raw.getAllSync(
    `SELECT id, baby_id, profile_id, event_type_id, timestamp, notes, "values", metadata
     FROM timeline_events
     WHERE event_type_id IN ('weight', 'height')
     ORDER BY baby_id, timestamp;`
  );

  if (events.length === 0) {
    await AsyncStorage.setItem('migration_measurement_done', 'true');
    return;
  }

  // Group by baby + 5-minute window
  const groups: Array<{
    babyId: string;
    profileId: string;
    ts: number;
    notes: string[];
    ids: string[];
    values: Record<string, number>;
  }> = [];

  for (const ev of events) {
    const ts = ev.timestamp;
    let group = groups[groups.length - 1];
    if (!group || group.babyId !== ev.baby_id || Math.abs(group.ts - ts) > 5 * 60 * 1000) {
      group = {
        babyId: ev.baby_id,
        profileId: ev.profile_id ?? '',
        ts,
        notes: [],
        ids: [],
        values: {},
      };
      groups.push(group);
    }
    group.ids.push(ev.id);
    if (ev.notes) group.notes.push(ev.notes);

    if (ev.values && ev.values !== '{}') {
      try {
        const vals = JSON.parse(ev.values);
        if (ev.event_type_id === 'weight' && vals.weight != null) {
          group.values.weightKg = vals.weight;
        }
        if (ev.event_type_id === 'height' && vals.height != null) {
          group.values.heightCm = vals.height;
        }
      } catch {}
    }
    if (ev.metadata && ev.metadata !== '{}') {
      try {
        const meta = JSON.parse(ev.metadata);
        if (ev.event_type_id === 'weight' && meta.weightGrams != null && group.values.weightKg == null) {
          group.values.weightKg = meta.weightGrams / 1000;
        }
        if (ev.event_type_id === 'height' && meta.heightMm != null && group.values.heightCm == null) {
          group.values.heightCm = meta.heightMm / 10;
        }
      } catch {}
    }
  }

  const deleteIds: string[] = [];

  for (const group of groups) {
    const combinedNotes = group.notes.filter(Boolean).join('; ') || null;
    const valuesJson = JSON.stringify(group.values);

    _raw.execSync(
      `INSERT INTO timeline_events (id, baby_id, profile_id, event_type_id, timestamp, notes, "values", created_at)
       VALUES ('${generateId()}', '${group.babyId}', '${group.profileId}', 'measurement', ${group.ts},
       ${combinedNotes ? `'${combinedNotes.replace(/'/g, "''")}'` : 'NULL'},
       '${valuesJson.replace(/'/g, "''")}', ${Date.now()});`
    );

    deleteIds.push(...group.ids);
  }

  for (const id of deleteIds) {
    _raw.execSync(`DELETE FROM timeline_events WHERE id = '${id}';`);
  }

  await AsyncStorage.setItem('migration_measurement_done', 'true');
  console.log(`[Cielo] Migrated ${deleteIds.length} weight/height events to measurement`);
}

// ─── RESET TOTAL (solo para desarrollo) ─────────────────────────────────────

export async function resetAllData() {
  if (!_raw) throw new Error('DB no inicializada');

  // 1. Borrar todos los datos (orden inverso por foreign keys)
  await _raw.execAsync(`
    DELETE FROM food_logs;
    DELETE FROM timeline_events;
    DELETE FROM feeding_status_events;
    DELETE FROM feeding_sessions;
    DELETE FROM sleep_status_events;
    DELETE FROM sleep_sessions;
    DELETE FROM growth_logs;
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
