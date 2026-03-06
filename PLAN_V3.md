# 🌙 CIELO APP — PLAN TÉCNICO V3
### Por Buscer · Arquitectura Local-First · Validado marzo 2026
> *"Hecho para los que velan de noche. Por Cielo."*

---

## ⚠️ LECCIONES APRENDIDAS (acumuladas V1 → V3)

| Problema | Solución definitiva |
|---|---|
| `better-sqlite3` en dependencies → crash en device | Eliminado. Solo existe internamente en drizzle-kit |
| `npm install` sin flags → ERESOLVE por React 19 | Siempre `--legacy-peer-deps` |
| `npx drizzle-kit generate` no encuentra drizzle-orm | Crear migraciones SQL manualmente |
| `driver: 'expo'` en drizzle.config → deprecado | Solo `dialect: 'sqlite'` |
| `npx tailwindcss init` no funciona con NativeWind v4 | Crear todos los archivos de config a mano |
| PowerShell no soporta `&&` | Usar `cmd` con `cd /d` |
| `nativewind` sin versión → puede traer v5 preview | Pinear: `nativewind@^4.2.0 tailwindcss@^3.4.17` |
| `babel.config.js` sin plugin de Reanimated → error en runtime | Agregar `react-native-reanimated/plugin` en plugins |
| TypeScript no reconoce clases de NativeWind | Agregar `nativewind-env.d.ts` en la raíz |

---

## 0. FILOSOFÍA DE ARQUITECTURA

| Pilar | Decisión | Por qué |
|---|---|---|
| **Offline-First** | expo-sqlite + Drizzle ORM | Cero latencia, cero dependencia de red |
| **Auth Lazy** | Sin registro inicial | Elimina el mayor punto de abandono en onboarding |
| **Privacidad por Diseño** | FileSystem sandbox | Las fotos nunca salen del dispositivo sin el usuario |
| **No Over-Engineering** | TanStack Query para cache local | No Redux, no Zustand, no boilerplate |
| **Dark Mode Nativo** | NativeWind v4 + Expo | Uso nocturno real, sin fatiga visual |

---

## PASO 1: SETUP INICIAL

### 1.1 Crear el proyecto

```cmd
# En cmd (NO PowerShell — no soporta &&)
npx create-expo-app@latest cielo-app --template blank-typescript
cd /d cielo-app
```

### 1.2 Instalar dependencias nativas con expo

```cmd
npx expo install expo-router expo-sqlite expo-image-picker expo-file-system expo-sharing expo-clipboard @react-native-async-storage/async-storage react-native-reanimated react-native-svg
```

> ✅ `npx expo install` resuelve versiones compatibles con SDK 54 automáticamente.

### 1.3 Instalar dependencias npm

```cmd
npm install drizzle-orm @tanstack/react-query nativewind@^4.2.0 tailwindcss@^3.4.17 --legacy-peer-deps
```

> ⛔ NUNCA `nativewind` sin versión → puede instalar v5 preview con API diferente.
> ⛔ NUNCA `better-sqlite3` → es Node.js puro, crash inmediato en device.

### 1.4 Instalar drizzle-kit como devDependency

```cmd
npm install -D drizzle-kit --legacy-peer-deps
```

> ℹ️ drizzle-kit solo corre en tu máquina para generar SQL. No va al dispositivo.

### 1.5 package.json esperado

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "~2.1.2",
    "@tanstack/react-query": "^5.x",
    "drizzle-orm": "^0.36.x",
    "expo": "~54.x",
    "expo-clipboard": "~7.0.x",
    "expo-file-system": "~18.x",
    "expo-image-picker": "~16.x",
    "expo-router": "~4.x",
    "expo-sharing": "~13.x",
    "expo-sqlite": "~15.x",
    "expo-status-bar": "~2.x",
    "nativewind": "^4.2.0",
    "react": "19.x",
    "react-native": "0.7x",
    "react-native-reanimated": "~3.x",
    "react-native-svg": "~15.x",
    "tailwindcss": "^3.4.17"
  },
  "devDependencies": {
    "@types/react": "~19.x",
    "drizzle-kit": "^0.27.x",
    "typescript": "~5.x"
  }
}
```

> ⛔ Si aparece `better-sqlite3`, `react-dom` o `expo-media-library` → eliminar.

---

### 1.6 Archivos de configuración (crear todos manualmente)

**`tailwind.config.js`**
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg:          '#0A0A0F',
        bgCard:      '#12121A',
        bgElevated:  '#1C1C2E',
        textPrimary: '#F0EFF5',
        textMuted:   '#6B6880',
        cielo:       '#7C5CBF',
        cieloLight:  '#E2C1FF',
        pink:        '#FF6B9D',
        pee:         '#F5C842',
        poop:        '#8B5E3C',
        danger:      '#FF4757',
        safe:        '#2ED573',
        growth:      '#38BDF8',
      },
    },
  },
  plugins: [],
};
```

**`babel.config.js`** ← CORREGIDO en V3
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin", // ← REQUERIDO para SDK 54 + Reanimated v3+
      // ⛔ NUNCA agregar react-native-worklets/plugin — duplica y rompe Reanimated
    ],
  };
};
```

**`metro.config.js`**
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

**`global.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`drizzle.config.ts`**
```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  // ⛔ NO poner driver: 'expo' → deprecado desde drizzle-kit 0.25+
} satisfies Config;
```

**`nativewind-env.d.ts`** ← NUEVO en V3
```ts
/// <reference types="nativewind/types" />
```

> ⛔ NUNCA correr `npx tailwindcss init` — no existe en NativeWind v4. Todo se crea a mano.

---

### 1.7 Estructura de carpetas

```cmd
mkdir app\onboarding app\dashboard app\logs\diaper app\logs\feeding app\logs\growth app\report
mkdir src\db\migrations src\hooks src\services src\components\ui src\components\layout src\constants src\types
```

```
cielo-app/
├── app/
│   ├── _layout.tsx               ← Root layout: providers + runMigrations + redirect
│   ├── index.tsx                 ← Entry point vacío
│   ├── onboarding/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx           ← Logo + bienvenida
│   │   ├── role.tsx              ← Selección de rol
│   │   └── baby.tsx              ← Nombre y fecha del bebé
│   ├── dashboard/
│   │   ├── _layout.tsx
│   │   └── index.tsx             ← Dashboard con últimos registros
│   ├── logs/
│   │   ├── diaper/
│   │   │   ├── new.tsx           ← Formulario Poop-O-Meter
│   │   │   └── [id].tsx          ← Detalle de registro
│   │   ├── feeding/
│   │   │   └── new.tsx           ← Formulario de toma
│   │   └── growth/
│   │       ├── new.tsx           ← Formulario peso + estatura   ← NUEVO
│   │       └── history.tsx       ← Gráfica de curva de crecimiento ← NUEVO
│   └── report/
│       └── generate.tsx          ← Generador de reporte
├── src/
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   │       └── 0000_init.sql
│   ├── hooks/
│   │   ├── useDiaperLogs.ts
│   │   ├── useFeedingLogs.ts
│   │   ├── useGrowthLogs.ts      ← NUEVO
│   │   ├── useProfile.ts
│   │   ├── useBaby.ts
│   │   └── useCamera.ts
│   ├── services/
│   │   ├── imageStorage.ts
│   │   └── reportGenerator.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── WatchfulEye.tsx
│   │   │   ├── BigButton.tsx
│   │   │   ├── PoopOMeter.tsx
│   │   │   ├── AlertToggle.tsx
│   │   │   └── GrowthChart.tsx   ← NUEVO
│   │   └── layout/
│   │       └── SafeScreen.tsx
│   ├── constants/
│   │   ├── colors.ts
│   │   └── roles.ts
│   └── types/
│       └── index.ts
├── global.css
├── nativewind-env.d.ts           ← NUEVO
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
└── drizzle.config.ts
```

---

## PASO 2: BASE DE DATOS

### 2.1 Schema Drizzle (src/db/schema.ts)

```ts
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
```

> ℹ️ **¿Por qué gramos y milímetros?** Guardar `3.5` como `real` en SQLite puede generar `3.4999999` por precisión flotante. Al guardar `3500` como `integer` y dividir en la UI obtienes siempre `3.5` exacto.

### 2.2 Migración SQL manual (src/db/migrations/0000_init.sql)

```sql
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

CREATE TABLE IF NOT EXISTS diaper_logs (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL REFERENCES babies(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  timestamp INTEGER NOT NULL,
  pee_intensity INTEGER DEFAULT 0,
  poop_intensity INTEGER DEFAULT 0,
  has_blood INTEGER DEFAULT 0,
  has_mucus INTEGER DEFAULT 0,
  has_diarrhea INTEGER DEFAULT 0,
  color TEXT,
  consistency TEXT,
  image_uri TEXT,
  image_thumb_uri TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS feeding_logs (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL REFERENCES babies(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,
  duration_min INTEGER,
  amount_ml REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS growth_logs (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL REFERENCES babies(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  timestamp INTEGER NOT NULL,
  weight_grams INTEGER,
  height_mm INTEGER,
  head_circ_mm INTEGER,
  notes TEXT
);
```

### 2.3 Cliente SQLite (src/db/client.ts)

```ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqliteDb = SQLite.openDatabaseSync('cielo.db');
export const db = drizzle(sqliteDb, { schema });

export async function runMigrations() {
  await sqliteDb.execAsync(`PRAGMA journal_mode = WAL;`);
  await sqliteDb.execAsync(`PRAGMA foreign_keys = ON;`);
  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
      avatar_uri TEXT, is_default INTEGER DEFAULT 0, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS babies (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
      birth_date INTEGER NOT NULL, photo_uri TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS diaper_logs (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      timestamp INTEGER NOT NULL,
      pee_intensity INTEGER DEFAULT 0, poop_intensity INTEGER DEFAULT 0,
      has_blood INTEGER DEFAULT 0, has_mucus INTEGER DEFAULT 0,
      has_diarrhea INTEGER DEFAULT 0, color TEXT, consistency TEXT,
      image_uri TEXT, image_thumb_uri TEXT, notes TEXT
    );
    CREATE TABLE IF NOT EXISTS feeding_logs (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      timestamp INTEGER NOT NULL, type TEXT NOT NULL,
      duration_min INTEGER, amount_ml REAL, notes TEXT
    );
    CREATE TABLE IF NOT EXISTS growth_logs (
      id TEXT PRIMARY KEY NOT NULL,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      timestamp INTEGER NOT NULL,
      weight_grams INTEGER,
      height_mm INTEGER,
      head_circ_mm INTEGER,
      notes TEXT
    );
  `);
}
```

---

## PASO 3: ROOT LAYOUT Y NAVEGACIÓN

### 3.1 app/_layout.tsx

```tsx
import '../global.css'; // ← PRIMERA línea, crítico para NativeWind
import { useEffect, useState } from 'react';
import { Slot, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { runMigrations } from '@/src/db/client';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await runMigrations(); // ← Siempre primero
      const done = await AsyncStorage.getItem('onboarding_done');
      router.replace(done ? '/dashboard' : '/onboarding/welcome');
      setReady(true);
    }
    init();
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
```

### 3.2 app/index.tsx

```tsx
export default function Index() {
  return null; // _layout.tsx hace el redirect
}
```

---

## PASO 4: ONBOARDING

**Flujo:**
```
_layout.tsx → chequea 'onboarding_done'
    ↓ NO                     ↓ SÍ
/onboarding/welcome      /dashboard
    ↓
/onboarding/role
    ↓
/onboarding/baby → guarda DB → setItem('onboarding_done') → /dashboard
```

### 4.1 Constantes

```ts
// src/constants/roles.ts
export const ROLES = [
  { id: 'mama',   label: 'Mamá',       emoji: '👩' },
  { id: 'papa',   label: 'Papá',       emoji: '👨' },
  { id: 'abue',   label: 'Abue',       emoji: '👴' },
  { id: 'nanny',  label: 'Niñera',     emoji: '🧑‍🍼' },
  { id: 'bestie', label: 'Tío/Bestie', emoji: '🦸' },
] as const;
export type Role = typeof ROLES[number]['id'];
```

```ts
// src/constants/colors.ts
export const colors = {
  bg: '#0A0A0F', bgCard: '#12121A', bgElevated: '#1C1C2E',
  textPrimary: '#F0EFF5', textMuted: '#6B6880',
  purple: '#7C5CBF', purpleLight: '#E2C1FF', pink: '#FF6B9D',
  pee: '#F5C842', poop: '#8B5E3C', alert: '#FF4757', safe: '#2ED573',
  growth: '#38BDF8', // Azul cielo para el módulo de crecimiento
} as const;
```

### 4.2 Hook useProfile (src/hooks/useProfile.ts)

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { profiles } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import type { Role } from '@/src/constants/roles';

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; role: Role }) => {
      const id = crypto.randomUUID();
      await db.insert(profiles).values({
        id, name: input.name, role: input.role,
        isDefault: true, createdAt: new Date(),
      });
      await AsyncStorage.setItem('active_profile_id', id);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useActiveProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const id = await AsyncStorage.getItem('active_profile_id');
      if (!id) return null;
      const res = await db.select().from(profiles).where(eq(profiles.id, id));
      return res[0] ?? null;
    },
  });
}
```

### 4.3 Hook useBaby (src/hooks/useBaby.ts)

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { babies } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export function useCreateBaby() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; birthDate: Date }) => {
      const id = crypto.randomUUID();
      await db.insert(babies).values({
        id, name: input.name, birthDate: input.birthDate, createdAt: new Date(),
      });
      await AsyncStorage.setItem('active_baby_id', id);
      await AsyncStorage.setItem('onboarding_done', 'true'); // ← Aquí, al final
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baby'] }),
  });
}

export function useActiveBaby() {
  return useQuery({
    queryKey: ['baby'],
    queryFn: async () => {
      const id = await AsyncStorage.getItem('active_baby_id');
      if (!id) return null;
      const res = await db.select().from(babies).where(eq(babies.id, id));
      return res[0] ?? null;
    },
  });
}
```

---

## PASO 5: COMPONENTES UI BASE

### 5.1 SafeScreen (src/components/layout/SafeScreen.tsx)

```tsx
import { SafeAreaView, ScrollView, View } from 'react-native';

export function SafeScreen({ children, scrollable = false }: {
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      {scrollable
        ? <ScrollView className="flex-1 px-4 pt-2">{children}</ScrollView>
        : <View className="flex-1 px-4 pt-2">{children}</View>}
    </SafeAreaView>
  );
}
```

### 5.2 BigButton (src/components/ui/BigButton.tsx)

```tsx
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

const variants = {
  primary:   'bg-cielo',
  secondary: 'bg-bgElevated border border-cielo',
  ghost:     'bg-transparent border border-zinc-700',
  growth:    'bg-sky-900 border border-growth',
};

export function BigButton({ label, onPress, variant = 'primary', loading, disabled }: {
  label: string; onPress: () => void;
  variant?: keyof typeof variants;
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled || loading}
      className={`${variants[variant]} rounded-2xl py-4 px-6 items-center min-h-[56px] justify-center`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {loading
        ? <ActivityIndicator color="#F0EFF5" />
        : <Text className="text-textPrimary font-bold text-lg">{label}</Text>}
    </TouchableOpacity>
  );
}
```

### 5.3 PoopOMeter (src/components/ui/PoopOMeter.tsx)

```tsx
import { View, Text, TouchableOpacity } from 'react-native';

export function PoopOMeter({ label, value, onChange, color }: {
  label: string; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-textPrimary mb-2 text-base">{label}</Text>
      <View className="flex-row gap-2">
        {[0, 1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n} onPress={() => onChange(n)}
            className="flex-1 h-10 rounded-lg items-center justify-center"
            style={{ backgroundColor: n === 0 ? '#1C1C2E' : n <= value ? color : '#1C1C2E', opacity: n > 0 && n > value ? 0.3 : 1 }}
          >
            <Text className="text-textPrimary text-sm font-bold">{n === 0 ? '✗' : n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
```

### 5.4 AlertToggle (src/components/ui/AlertToggle.tsx)

```tsx
import { TouchableOpacity, View, Text } from 'react-native';

export function AlertToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${value ? 'bg-red-950 border border-danger' : 'bg-bgCard'}`}
    >
      <Text className={`text-base ${value ? 'text-danger font-bold' : 'text-textMuted'}`}>{label}</Text>
      <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${value ? 'bg-danger border-danger' : 'border-zinc-600'}`}>
        {value && <Text className="text-white text-xs font-bold">✓</Text>}
      </View>
    </TouchableOpacity>
  );
}
```

---

## PASO 6: MÓDULO DE CRECIMIENTO ← NUEVO EN V3

### 6.1 Hook useGrowthLogs (src/hooks/useGrowthLogs.ts)

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { growthLogs } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';

// Helpers de conversión — la UI trabaja en kg/cm, la DB en g/mm
export const kgToGrams = (kg: number) => Math.round(kg * 1000);
export const gramsToKg = (g: number) => (g / 1000).toFixed(2);
export const cmToMm = (cm: number) => Math.round(cm * 10);
export const mmToCm = (mm: number) => (mm / 10).toFixed(1);

export function useSaveGrowthLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      weightKg?: number;   // Opcional: puede medir solo estatura
      heightCm?: number;   // Opcional: puede pesar solo
      headCircCm?: number; // Opcional: circunferencia cefálica
      notes?: string;
    }) => {
      const babyId    = await AsyncStorage.getItem('active_baby_id') ?? '';
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      await db.insert(growthLogs).values({
        id:           crypto.randomUUID(),
        babyId, profileId,
        timestamp:    new Date(),
        weightGrams:  input.weightKg != null ? kgToGrams(input.weightKg) : null,
        heightMm:     input.heightCm != null ? cmToMm(input.heightCm) : null,
        headCircMm:   input.headCircCm != null ? cmToMm(input.headCircCm) : null,
        notes:        input.notes ?? null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth_logs'] }),
  });
}

export function useGrowthHistory(babyId?: string) {
  return useQuery({
    queryKey: ['growth_logs', 'history', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      return db.select().from(growthLogs)
        .where(eq(growthLogs.babyId, babyId!))
        .orderBy(desc(growthLogs.timestamp));
    },
  });
}

export function useLastGrowthLog(babyId?: string) {
  return useQuery({
    queryKey: ['growth_logs', 'last', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      const res = await db.select().from(growthLogs)
        .where(eq(growthLogs.babyId, babyId!))
        .orderBy(desc(growthLogs.timestamp))
        .limit(1);
      return res[0] ?? null;
    },
  });
}
```

### 6.2 Pantalla de nuevo registro (app/logs/growth/new.tsx)

```tsx
import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeScreen } from '@/src/components/layout/SafeScreen';
import { BigButton } from '@/src/components/ui/BigButton';
import { useSaveGrowthLog } from '@/src/hooks/useGrowthLogs';

export default function NewGrowthLog() {
  const [weightKg, setWeightKg]       = useState('');
  const [heightCm, setHeightCm]       = useState('');
  const [headCircCm, setHeadCircCm]   = useState('');
  const [notes, setNotes]             = useState('');
  const save = useSaveGrowthLog();

  const handleSave = () => {
    const payload = {
      weightKg:   weightKg   ? parseFloat(weightKg)   : undefined,
      heightCm:   heightCm   ? parseFloat(heightCm)   : undefined,
      headCircCm: headCircCm ? parseFloat(headCircCm) : undefined,
      notes:      notes || undefined,
    };
    // Validar que al menos uno de los dos campos principales esté lleno
    if (!payload.weightKg && !payload.heightCm) return;
    save.mutate(payload, { onSuccess: () => router.back() });
  };

  return (
    <SafeScreen scrollable>
      <Text className="text-textPrimary text-2xl font-bold mb-6">📏 Crecimiento</Text>

      <Text className="text-textMuted mb-1 text-sm">Peso (kg)</Text>
      <TextInput
        className="bg-bgCard text-textPrimary rounded-xl p-4 mb-4 text-lg"
        placeholder="Ej: 4.2"
        placeholderTextColor="#6B6880"
        keyboardType="decimal-pad"
        value={weightKg}
        onChangeText={setWeightKg}
      />

      <Text className="text-textMuted mb-1 text-sm">Estatura (cm)</Text>
      <TextInput
        className="bg-bgCard text-textPrimary rounded-xl p-4 mb-4 text-lg"
        placeholder="Ej: 55.5"
        placeholderTextColor="#6B6880"
        keyboardType="decimal-pad"
        value={heightCm}
        onChangeText={setHeightCm}
      />

      <Text className="text-textMuted mb-1 text-sm">Circunferencia cefálica (cm) — opcional</Text>
      <TextInput
        className="bg-bgCard text-textPrimary rounded-xl p-4 mb-4 text-lg"
        placeholder="Ej: 36.0"
        placeholderTextColor="#6B6880"
        keyboardType="decimal-pad"
        value={headCircCm}
        onChangeText={setHeadCircCm}
      />

      <Text className="text-textMuted mb-1 text-sm">Notas</Text>
      <TextInput
        className="bg-bgCard text-textPrimary rounded-xl p-4 mb-6"
        placeholder="Ej: Consulta del mes 2"
        placeholderTextColor="#6B6880"
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <BigButton
        label="Guardar"
        onPress={handleSave}
        variant="growth"
        loading={save.isPending}
        disabled={!weightKg && !heightCm}
      />
    </SafeScreen>
  );
}
```

### 6.3 Historial y gráfica (app/logs/growth/history.tsx)

```tsx
import { View, Text, ScrollView } from 'react-native';
import { SafeScreen } from '@/src/components/layout/SafeScreen';
import { useActiveBaby } from '@/src/hooks/useBaby';
import { useGrowthHistory, gramsToKg, mmToCm } from '@/src/hooks/useGrowthLogs';

export default function GrowthHistory() {
  const { data: baby } = useActiveBaby();
  const { data: logs } = useGrowthHistory(baby?.id);

  return (
    <SafeScreen scrollable>
      <Text className="text-textPrimary text-2xl font-bold mb-6">📈 Curva de Crecimiento</Text>

      {/* Mini tabla de registros */}
      <View className="bg-bgCard rounded-xl overflow-hidden mb-6">
        <View className="flex-row bg-bgElevated px-4 py-2">
          <Text className="text-textMuted text-xs flex-1">Fecha</Text>
          <Text className="text-textMuted text-xs w-20 text-center">Peso</Text>
          <Text className="text-textMuted text-xs w-20 text-center">Estatura</Text>
        </View>
        {(logs ?? []).map(log => (
          <View key={log.id} className="flex-row px-4 py-3 border-t border-bgElevated">
            <Text className="text-textPrimary text-sm flex-1">
              {new Date(log.timestamp).toLocaleDateString('es-MX')}
            </Text>
            <Text className="text-growth text-sm w-20 text-center font-bold">
              {log.weightGrams ? `${gramsToKg(log.weightGrams)} kg` : '—'}
            </Text>
            <Text className="text-cieloLight text-sm w-20 text-center font-bold">
              {log.heightMm ? `${mmToCm(log.heightMm)} cm` : '—'}
            </Text>
          </View>
        ))}
        {(!logs || logs.length === 0) && (
          <Text className="text-textMuted text-sm p-4 text-center">Sin registros aún</Text>
        )}
      </View>
    </SafeScreen>
  );
}
```

> ℹ️ **Gráfica visual:** Para v1.1 agregar `react-native-svg-charts` o `victory-native` para dibujar la curva de crecimiento de la OMS. En MVP es suficiente la tabla.

---

## PASO 7: MÓDULO DE CÁMARA

### 7.1 imageStorage.ts (src/services/imageStorage.ts)

```ts
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const CIELO_DIR = `${FileSystem.documentDirectory}cielo/diapers/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CIELO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(CIELO_DIR, { intermediates: true });
}

export async function captureAndStore(): Promise<string | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7, allowsEditing: false, base64: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  await ensureDir();
  const dest = `${CIELO_DIR}${crypto.randomUUID()}.jpg`;
  await FileSystem.moveAsync({ from: result.assets[0].uri, to: dest });
  return dest;
}

export async function deletePhoto(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
}
```

### 7.2 useCamera.ts (src/hooks/useCamera.ts)

```ts
import { useState, useCallback } from 'react';
import { captureAndStore, deletePhoto } from '@/src/services/imageStorage';

export function useCamera() {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const capture = useCallback(async () => {
    setLoading(true);
    try { const r = await captureAndStore(); setUri(r); return r; }
    finally { setLoading(false); }
  }, []);

  const discard = useCallback(async () => {
    if (uri) { await deletePhoto(uri); setUri(null); }
  }, [uri]);

  return { uri, capture, discard, loading };
}
```

---

## PASO 8: LOGS DE PAÑAL Y ALIMENTACIÓN

### 8.1 useDiaperLogs.ts (src/hooks/useDiaperLogs.ts)

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { diaperLogs } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { NewDiaperLog } from '@/src/db/schema';

export function useSaveDiaperLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<NewDiaperLog, 'id' | 'babyId' | 'profileId' | 'timestamp'>) => {
      const babyId    = await AsyncStorage.getItem('active_baby_id') ?? '';
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      await db.insert(diaperLogs).values({
        id: crypto.randomUUID(), babyId, profileId, timestamp: new Date(), ...input,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diaper_logs'] }),
  });
}

export function useLastDiaperLog(babyId?: string) {
  return useQuery({
    queryKey: ['diaper_logs', 'last', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      const res = await db.select().from(diaperLogs)
        .where(eq(diaperLogs.babyId, babyId!))
        .orderBy(desc(diaperLogs.timestamp)).limit(1);
      return res[0] ?? null;
    },
  });
}
```

### 8.2 useFeedingLogs.ts (src/hooks/useFeedingLogs.ts)

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/db/client';
import { feedingLogs } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { NewFeedingLog } from '@/src/db/schema';

export function useSaveFeedingLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<NewFeedingLog, 'id' | 'babyId' | 'profileId' | 'timestamp'>) => {
      const babyId    = await AsyncStorage.getItem('active_baby_id') ?? '';
      const profileId = await AsyncStorage.getItem('active_profile_id') ?? '';
      await db.insert(feedingLogs).values({
        id: crypto.randomUUID(), babyId, profileId, timestamp: new Date(), ...input,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feeding_logs'] }),
  });
}

export function useLastFeedingLog(babyId?: string) {
  return useQuery({
    queryKey: ['feeding_logs', 'last', babyId],
    enabled: !!babyId,
    queryFn: async () => {
      const res = await db.select().from(feedingLogs)
        .where(eq(feedingLogs.babyId, babyId!))
        .orderBy(desc(feedingLogs.timestamp)).limit(1);
      return res[0] ?? null;
    },
  });
}
```

---

## PASO 9: DASHBOARD

```tsx
// app/dashboard/index.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeScreen } from '@/src/components/layout/SafeScreen';
import { BigButton } from '@/src/components/ui/BigButton';
import { useActiveBaby } from '@/src/hooks/useBaby';
import { useLastDiaperLog } from '@/src/hooks/useDiaperLogs';
import { useLastFeedingLog } from '@/src/hooks/useFeedingLogs';
import { useLastGrowthLog, gramsToKg, mmToCm } from '@/src/hooks/useGrowthLogs';

function timeAgo(date: Date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function Dashboard() {
  const { data: baby }          = useActiveBaby();
  const { data: lastDiaper }    = useLastDiaperLog(baby?.id);
  const { data: lastFeeding }   = useLastFeedingLog(baby?.id);
  const { data: lastGrowth }    = useLastGrowthLog(baby?.id);

  return (
    <SafeScreen>
      {/* Header */}
      <View className="flex-row items-center justify-between py-4">
        <Text className="text-white text-2xl font-bold">🌙 {baby?.name ?? 'Cielo'}</Text>
        <TouchableOpacity onPress={() => router.push('/logs/growth/history')}>
          <Text className="text-growth text-sm">📈 Curva</Text>
        </TouchableOpacity>
      </View>

      {/* Status cards */}
      <View className="gap-3 mb-6">
        <View className="bg-bgCard rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-textMuted">💧 Último pañal</Text>
          <Text className="text-textPrimary font-bold">
            {lastDiaper ? timeAgo(new Date(lastDiaper.timestamp)) : 'Sin registros'}
          </Text>
        </View>
        <View className="bg-bgCard rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-textMuted">🍼 Última toma</Text>
          <Text className="text-textPrimary font-bold">
            {lastFeeding ? timeAgo(new Date(lastFeeding.timestamp)) : 'Sin registros'}
          </Text>
        </View>
        <View className="bg-bgCard rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-textMuted">📏 Último peso</Text>
          <Text className="text-growth font-bold">
            {lastGrowth?.weightGrams
              ? `${gramsToKg(lastGrowth.weightGrams)} kg`
              : '—'
            }
            {lastGrowth?.heightMm
              ? `  ·  ${mmToCm(lastGrowth.heightMm)} cm`
              : ''}
          </Text>
        </View>
      </View>

      {/* Botones de acción — mínimo 56px para uso nocturno */}
      <View className="gap-3 flex-1 justify-end pb-6">
        <BigButton label="💩  Registrar Pañal"
          onPress={() => router.push('/logs/diaper/new')} variant="primary" />
        <BigButton label="🍼  Registrar Toma"
          onPress={() => router.push('/logs/feeding/new')} variant="secondary" />
        <BigButton label="📏  Peso / Estatura"
          onPress={() => router.push('/logs/growth/new')} variant="growth" />
        <BigButton label="📋  Generar Reporte"
          onPress={() => router.push('/report/generate')} variant="ghost" />
      </View>
    </SafeScreen>
  );
}
```

---

## PASO 10: GENERADOR DE REPORTES

```ts
// src/services/reportGenerator.ts
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import type { DiaperLog, Baby, Profile, GrowthLog } from '@/src/db/schema';
import { gramsToKg, mmToCm } from '@/src/hooks/useGrowthLogs';

export function buildDiaperCaption(log: DiaperLog, baby: Baby, profile: Profile): string {
  const hora  = new Date(log.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date(log.timestamp).toLocaleDateString('es-MX');
  const emoji = ['', '🟢', '🟡', '🟠', '🔴', '☠️'];
  const alertas = [
    log.hasBlood && '🩸 Sangre',
    log.hasMucus && '🤧 Mucosidad',
    log.hasDiarrhea && '⚠️ Diarrea',
  ].filter(Boolean).join(' | ');

  return [
    `*🌙 Reporte Cielo — ${baby.name}*`,
    `📅 ${fecha} a las ${hora}`,
    `👤 ${profile.name} (${profile.role})`,
    ``,
    `💧 Pipi: ${emoji[log.peeIntensity ?? 0] || 'No'} (${log.peeIntensity}/5)`,
    `💩 Popó: ${emoji[log.poopIntensity ?? 0] || 'No'} (${log.poopIntensity}/5)`,
    log.color        ? `🎨 Color: ${log.color}` : null,
    log.consistency  ? `🧪 Consistencia: ${log.consistency}` : null,
    ``,
    alertas ? `🚨 *ALERTAS:* ${alertas}` : `✅ Sin alertas médicas`,
    log.notes ? `📝 ${log.notes}` : null,
    ``,
    `_Enviado desde Cielo App_`,
  ].filter(Boolean).join('\n');
}

export function buildGrowthCaption(log: GrowthLog, baby: Baby, profile: Profile): string {
  const fecha = new Date(log.timestamp).toLocaleDateString('es-MX');
  return [
    `*📏 Reporte de Crecimiento — ${baby.name}*`,
    `📅 ${fecha}`,
    `👤 ${profile.name} (${profile.role})`,
    ``,
    log.weightGrams ? `⚖️ Peso: ${gramsToKg(log.weightGrams)} kg` : null,
    log.heightMm    ? `📐 Estatura: ${mmToCm(log.heightMm)} cm` : null,
    log.headCircMm  ? `🔵 Cef.: ${mmToCm(log.headCircMm)} cm` : null,
    log.notes       ? `📝 ${log.notes}` : null,
    ``,
    `_Enviado desde Cielo App_`,
  ].filter(Boolean).join('\n');
}

export async function shareDiaperReport(log: DiaperLog, baby: Baby, profile: Profile) {
  const caption = buildDiaperCaption(log, baby, profile);
  if (log.imageUri) {
    await Clipboard.setStringAsync(caption);
    await Sharing.shareAsync(log.imageUri, {
      mimeType: 'image/jpeg',
      dialogTitle: '📋 Caption copiado — pega en WhatsApp',
    });
  } else {
    const tmp = `${FileSystem.cacheDirectory}reporte-cielo.txt`;
    await FileSystem.writeAsStringAsync(tmp, caption);
    await Sharing.shareAsync(tmp, { mimeType: 'text/plain', dialogTitle: 'Compartir reporte' });
  }
}

export async function shareGrowthReport(log: GrowthLog, baby: Baby, profile: Profile) {
  const caption = buildGrowthCaption(log, baby, profile);
  const tmp = `${FileSystem.cacheDirectory}crecimiento-cielo.txt`;
  await FileSystem.writeAsStringAsync(tmp, caption);
  await Sharing.shareAsync(tmp, { mimeType: 'text/plain', dialogTitle: 'Compartir reporte de crecimiento' });
}
```

---

## PASO 11: CHECKLIST ANTES DE `npx expo start --clear`

```
□ package.json NO tiene better-sqlite3, react-dom, expo-media-library
□ nativewind es ^4.2.0 (NO v5)
□ babel.config.js tiene react-native-reanimated/plugin en plugins[]
□ babel.config.js NO tiene react-native-worklets/plugin
□ metro.config.js existe con withNativeWind
□ global.css existe con @tailwind directives
□ nativewind-env.d.ts existe en la raíz
□ app/_layout.tsx importa '../global.css' como PRIMERA línea
□ src/db/client.ts tiene CREATE TABLE IF NOT EXISTS para las 5 tablas
□ _layout.tsx llama await runMigrations() antes del redirect
□ growth_logs está en runMigrations() y en 0000_init.sql
□ Primer arranque: npx expo start --clear
```

---

## DESCRIPCIÓN DE CONTEXTO PARA IA

> Cielo App es una app móvil de seguimiento de cuidado de bebés con React Native + Expo SDK 54 (TypeScript). Arquitectura offline-first usando expo-sqlite + Drizzle ORM, TanStack Query para cache, NativeWind v4 + Tailwind CSS, expo-router (file-based). Registra pañales (Poop-O-Meter 1-5, alertas médicas, foto), tomas de alimentación, y peso/estatura (guardados en gramos/milímetros internamente). Genera reportes compartibles por WhatsApp. Fotos en sandbox local, nunca en servidor. Sin login: onboarding de rol + nombre del bebé guardado en SQLite. Stack: expo-sqlite, drizzle-orm@^0.36, @tanstack/react-query@^5, nativewind@^4.2, tailwindcss@^3.4, expo-router, expo-image-picker, expo-file-system, expo-sharing, expo-clipboard, @react-native-async-storage/async-storage, react-native-reanimated@~3.x, react-native-svg. Node 18+, npm con --legacy-peer-deps por React 19.

---

## ROADMAP

| Fase | Feature | Notas |
|---|---|---|
| **MVP** | Onboarding + Pañal + Toma + Peso/Estatura + Reporte | Este plan |
| v1.1 | Historial con timeline + gráfica OMS de crecimiento | victory-native |
| v1.2 | Notificaciones locales (próxima toma) | expo-notifications |
| v1.3 | Supabase sync (solo texto, nunca fotos) | Auth lazy conservado |
| v2.0 | Multi-bebé / multi-cuidador | Ajuste de schema |

---

## POLÍTICA DE PRIVACIDAD "ZERO-STORAGE"

```
1. CEGUERA A LA GALERÍA — Solo permiso CAMERA, nunca MEDIA_LIBRARY para leer
2. SANDBOX ESTRICTO     — Fotos en FileSystem.documentDirectory/cielo/diapers/
3. CERO UPLOADS         — No existe ningún endpoint ni librería de cloud storage
4. CLIENT-SIDE 100%     — Reportes generados en el hilo de la app
5. DERECHO AL OLVIDO    — Borrar foto individual o "Borrar todo"
```

---

---

## MONETIZACIÓN Y MODELO DE NEGOCIO

### Estrategia recomendada (en fases)

**FASE MVP — Gratis + Donaciones (lanzamiento)**
- App gratuita en Play Store sin restricciones
- Botón de donación dentro de la app que abre Ko-fi en el navegador
- ⚠️ NO usar sistema de pago propio dentro de la app para donaciones → viola políticas de Play Store
- ✅ Abrir URL externa a Ko-fi con `Linking.openURL()` es válido y sin comisión a Google

```tsx
// src/components/ui/DonationButton.tsx
import { Linking } from 'react-native';
export function DonationButton() {
  return (
    <BigButton
      label="☕ Apoyar a Cielo App"
      onPress={() => Linking.openURL('https://ko-fi.com/TU_USUARIO')}
      variant="ghost"
    />
  );
}
```

**FASE v1.x — Freemium con in-app purchases**

Features GRATIS siempre (core del producto):
- Registrar pañales, tomas, peso/estatura
- Dashboard con últimos registros
- Reporte de texto compartible
- 1 perfil de bebé

Features PREMIUM (via Google Play Billing):
- Historial con timeline completo y gráficas
- Curva de crecimiento OMS con percentiles
- Exportar PDF del historial
- Multi-bebé (hasta 3 bebés)
- Foto en reportes
- Notificaciones de próxima toma

### Implementación técnica de gates de features

```ts
// src/hooks/usePremium.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

export function usePremium() {
  return useQuery({
    queryKey: ['premium'],
    queryFn: async () => {
      // MVP: siempre false
      // v1.x: validar contra Google Play Billing o licencia local
      const license = await AsyncStorage.getItem('premium_license');
      return !!license;
    },
    staleTime: 1000 * 60 * 5, // re-validar cada 5 min
  });
}

// Uso en cualquier componente:
// const { data: isPremium } = usePremium();
// if (!isPremium) return <UpgradePrompt />;
```

### Arquitectura para in-app purchases (cuando llegue el momento)

```
Google Play Billing API
        ↓
  expo-iap (librería recomendada para Expo)
        ↓
  Validación de purchase token
        ↓
  Guardar en AsyncStorage ('premium_license')
        ↓
  usePremium() → gates de features
```

> ⚠️ Google cobra **15%** los primeros $1M USD/año por desarrollador, luego **30%**.
> Apple cobra **15-30%** según el tier del desarrollador.
> Las donaciones externas (Ko-fi) pagan **0%** de comisión a las tiendas.

### Modelo de precios sugerido (referencia)

| Plan | Precio | Features |
|---|---|---|
| Gratis | $0 | Core tracking completo |
| Premium | $2.99 USD único o $0.99/mes | Gráficas, PDF, multi-bebé, fotos en reporte |
| Donación | Lo que el usuario quiera | Nada extra, solo apoyo |

---

## ARCHIVOS LEGALES Y DE PROTECCIÓN

Crear antes del primer push a GitHub:

```
cielo-app/
├── LICENSE                    ← GPL v3 + restricción comercial
├── README.md                  ← Descripción pública del proyecto
├── CONTRIBUTING.md            ← Guía para contribuidores + CLA implícito
├── CHANGELOG.md               ← Historial de versiones
├── SECURITY.md                ← Cómo reportar vulnerabilidades
├── CODE_OF_CONDUCT.md         ← Código de conducta
├── docs/
│   ├── PRIVACY_POLICY.md      ← Política de privacidad (Play Store la requiere)
│   └── TERMS_OF_USE.md        ← Términos de uso
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.md
    │   └── feature_request.md
    └── PULL_REQUEST_TEMPLATE.md
```

> ✅ Todos estos archivos ya están creados en el proyecto.

### Checklist antes del primer `git push`

```
□ Reemplazar [TU EMAIL AQUÍ] en todos los archivos legales
□ Reemplazar [TU_USUARIO] en README.md (Ko-fi y GitHub)
□ Verificar que node_modules/ está en .gitignore
□ Verificar que .env y *.keystore están en .gitignore
□ git init (si no se hizo con create-expo-app)
□ git add .
□ git commit -m "feat: initial project setup with legal files"
□ Crear repo en GitHub (público)
□ git remote add origin https://github.com/TU_USUARIO/cielo-app.git
□ git push -u origin main
```

---

*Cielo App PLAN V3 · Validado marzo 2026 · Con módulo de crecimiento y monetización*
*Concepto: Buscer · Arquitectura: Claude (Anthropic)*
