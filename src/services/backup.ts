import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { getRawDb } from '@/src/db/client';

const BACKUP_VERSION = 1;

const ALL_TABLES = [
  'profiles',
  'babies',
  'event_types',
  'diaper_observations',
  'feeding_sessions',
  'feeding_status_events',
  'sleep_sessions',
  'sleep_status_events',
  'tags',
  'growth_logs',
  'timeline_events',
  'food_catalog',
  'food_logs',
  'event_presets',
  'sync_history',
  'sync_outbox',
  'catalog_items',
];

const INSERT_ORDER = [
  'profiles',
  'babies',
  'event_types',
  'diaper_observations',
  'food_catalog',
  'catalog_items',
  'tags',
  'feeding_sessions',
  'feeding_status_events',
  'sleep_sessions',
  'sleep_status_events',
  'growth_logs',
  'timeline_events',
  'food_logs',
  'event_presets',
  'sync_history',
  'sync_outbox',
];

export async function exportDatabase(): Promise<string> {
  const raw = getRawDb();
  const backup: Record<string, any> = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
  };

  for (const table of ALL_TABLES) {
    const rows = raw.getAllSync(`SELECT * FROM "${table}"`);
    backup[table] = rows;
  }

  const json = JSON.stringify(backup, null, 2);
  const filename = `cielo-backup-${Date.now()}.json`;
  const fileUri = (FileSystem.cacheDirectory ?? '') + filename;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar datos de Cielo',
    });
  } else {
    Alert.alert('Exportado', `Archivo guardado en: ${fileUri}`);
  }

  return fileUri;
}

export async function importDatabase(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return 0;

  const file = result.assets[0];
  const json = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const backup = JSON.parse(json);
  if (!backup.version || !backup.exportedAt) {
    throw new Error('Archivo de respaldo inválido');
  }

  const raw = getRawDb();
  const dbDir = (FileSystem.documentDirectory ?? '') + 'SQLite/';

  try {
    const info = await FileSystem.getInfoAsync(dbDir + 'cielo.db');
    if (info.exists) {
      await FileSystem.copyAsync({
        from: dbDir + 'cielo.db',
        to: dbDir + `cielo.db.backup.${Date.now()}`,
      });
    }
  } catch {
    // backup opcional
  }

  raw.execSync('PRAGMA foreign_keys = OFF;');

  try {
    for (const table of INSERT_ORDER) {
      raw.execSync(`DELETE FROM "${table}"`);
    }

    let total = 0;
    for (const table of INSERT_ORDER) {
      const rows = backup[table];
      if (!rows?.length) continue;

      for (const row of rows) {
        const columns = Object.keys(row);
        const colNames = columns.map((c) => `"${c}"`).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((c) => {
          const v = row[c];
          return v instanceof Date ? v.getTime() : v;
        });

        raw.runSync(
          `INSERT OR REPLACE INTO "${table}" (${colNames}) VALUES (${placeholders})`,
          ...values,
        );
        total++;
      }
    }

    return total;
  } finally {
    raw.execSync('PRAGMA foreign_keys = ON;');
  }
}
