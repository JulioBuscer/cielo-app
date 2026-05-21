---
name: drizzle-orm-local-first
description: Use Drizzle ORM with expo-sqlite for local-first mobile apps. Use when designing database schemas, writing migrations, creating queries, or optimizing SQLite performance in React Native.
---

# Drizzle ORM + Local-First Mobile

Guía para usar Drizzle ORM con expo-sqlite en apps offline-first.

## Setup

### drizzle.config.ts
```ts
import type { Config } from 'drizzle-kit';
export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
} satisfies Config;
```

NO poner `driver: 'expo'` — deprecado desde drizzle-kit 0.25+.

### Cliente lazy (crítico para New Architecture)
```ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _raw: SQLite.SQLiteDatabase | null = null;

export function getDb() {
  if (!_db) throw new Error('[Cielo] getDb() llamado antes de runMigrations()');
  return _db;
}

export async function runMigrations() {
  _raw = SQLite.openDatabaseSync('cielo.db');
  _db = drizzle(_raw, { schema });
  // PRAGMA + CREATE TABLE + seed
}
```

## Schema patterns

### Tablas base
```ts
export const profiles = sqliteTable('profiles', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### Enums como text con constraint
```ts
role: text('role', {
  enum: ['mama', 'papa', 'abue', 'nanny', 'bestie']
}).notNull(),
```

### Foreign keys
```ts
babyId: text('baby_id').notNull().references(() => babies.id),
```

### Timestamps como integers (evita problemas de timezone)
```ts
createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
```

### JSON metadata como text
```ts
metadata: text('metadata'), // JSON string parseado en runtime
```

## Queries con TanStack Query

### Select
```ts
const res = await getDb().select().from(profiles)
  .where(eq(profiles.id, id));
return res[0] ?? null;
```

### Insert
```ts
await getDb().insert(profiles).values({
  id: generateId(), name, role, createdAt: new Date(),
});
```

### Mutation pattern
```ts
export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      await getDb().insert(profiles).values({ ... });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
```

### Query con dependencia
```ts
export function useActiveBaby() {
  return useQuery({
    queryKey: ['baby'],
    queryFn: async () => { ... },
  });
}
```

## Migraciones

### Estrategia: runMigrations() en startup
```ts
// app/_layout.tsx
useEffect(() => {
  runMigrations()
    .then(() => setReady(true))
    .catch(e => setError(e.message));
}, []);
```

### ALTER TABLE seguro (SQLite no tiene IF NOT EXISTS para columnas)
```ts
for (const sql of [
  `ALTER TABLE babies ADD COLUMN nickname TEXT`,
  `ALTER TABLE babies ADD COLUMN sex TEXT DEFAULT 'unknown'`,
]) {
  try { await _raw.execAsync(sql); } catch { /* columna ya existe */ }
}
```

## Convenciones
- **snake_case** para columnas SQL
- **camelCase** para propiedades TS (Drizzle mapea automático)
- IDs: texto (UUID-like via `generateId()`)
- Pesos/tallas en enteros (gramos/mm) para evitar errores de float
