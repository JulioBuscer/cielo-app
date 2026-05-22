# 🌙 CIELO APP — PLAN MAESTRO V5 (Unificado)
> **Versión:** 5.2 · **Estado:** En desarrollo activo
> *"Hecho para los que velan de noche. Por Cielo."*

---

## 🗺️ VISIÓN DEL PRODUCTO

App de seguimiento de bebé para cuidadores. Modelo mental: el grupo de WhatsApp donde se mandaban mensajes tipo "ya lo amamanté", "hice cambio de pañal", "durmió 2h". La app replica esa dinámica con una **timeline tipo chat** donde todos los cuidadores ven el mismo registro.

**Offline-first, privacidad total, cero dependencia de servidor.**

---

## ✅ LO QUE YA FUNCIONA (V5.2)

### Infraestructura
- [x] Expo SDK 54, React Native 0.81.5, New Architecture habilitada
- [x] expo-sqlite + Drizzle ORM (patrón lazy `getDb()`)
- [x] TanStack Query v5 con invalidaciones por mutation
- [x] NativeWind v4 + Tailwind v3 + Reanimated v4
- [x] expo-router con Redirect desde `app/index.tsx`
- [x] `generateId()` propio (Hermes-safe)
- [x] EAS Build con `--legacy-peer-deps`
- [x] pnpm (migrado desde npm) con `shamefully-hoist=true`
- [x] Sistema de temas propio (React Context + inline styles, sin `dark:` variants)

### Base de Datos — Schema V5.2
| Tabla | Descripción |
|---|---|
| `profiles` | Cuidadores con rol (mamá/papá/abue/nanny/bestie) |
| `babies` | Perfil del bebé con avatar_emoji, photo_uri, nick, sexo, estado |
| `event_types` | Catálogo default + custom, con columna `metrics` (JSON: EventMetric[]) |
| `diaper_observations` | Catálogo default + custom (sangre, mucosidad, diarrea...) |
| `feeding_sessions` | Tomas con estados y timeline de eventos |
| `feeding_status_events` | Eventos de cambio de estado de toma (auditoría) |
| `sleep_sessions` | Siestas con estados (independientes de tomas) |
| `sleep_status_events` | Eventos de cambio de estado de siesta |
| `growth_logs` | Registros de peso/estatura/céfalo (enteros g/mm) |
| `timeline_events` | Timeline unificado, con columna `"values"` (JSON: Record<metricId, number>) |

### Onboarding
- [x] `welcome.tsx` — bienvenida con logo
- [x] `role.tsx` — selección de rol + nombre del cuidador
- [x] `baby.tsx` — nombre, apodo, sexo, fecha/hora nacimiento, avatar emoji/foto

### Dashboard (Timeline/Chat) — pantalla principal
- [x] FlatList invertida (más reciente abajo, scroll up para historial)
- [x] Header estilo WhatsApp con avatar dinámico del bebé
- [x] Botones de acción rápida: 🤱 Izq · 🤱 Der · 😴 Dormir · 🍼 Biberón · 🍑 Pañal · ➕ Evento
- [x] `ActiveFeedingCard` — toma activa con timer preciso + pausa/continuar/terminar
- [x] `ActiveSleepCard` — siesta activa con timer + controles
- [x] Ambas cards visibles simultáneamente
- [x] Input de nota rápida con botón verde WhatsApp
- [x] Modal de selección de evento + botón para crear tipo custom
- [x] Modal de subtipo de biberón
- [x] KeyboardAvoidingView
- [x] Botón 📊 en header → pantalla de estadísticas
- [x] Botón ⏱ Rezagada → toma retroactiva

### Tomas de Leche
- [x] Iniciar toma (pecho izq/der/biberón con subtipo)
- [x] Pausar / Continuar / Terminar
- [x] Auto-finish de toma anterior al iniciar nueva
- [x] Timer preciso basado en `feeding_status_events`
- [x] Historial de tomas en timeline con burbujas

### Sesiones de Sueño
- [x] `useSleepSessions.ts` — hooks start/pause/resume/finish/timer
- [x] `ActiveSleepCard` — card morada con timer preciso
- [x] Independiente de las tomas
- [x] Auto-finish de siesta anterior al iniciar nueva

### Pañales (v2 — rediseño completo)
- [x] `app/logs/diaper/new.tsx` con Pipímetro + Popómetro (intensidad + salud)
- [x] Observaciones multi-métrica (sangre, mucosidad, diarrea, etc.)
- [x] Peso del pañal inline
- [x] Foto del pañal (cámara o galería) con preview
- [x] Auto-pausa de toma activa
- [x] Mostrar salud con colores/emojis en detalle
- [x] Reportes y stats actualizados

### Otros Eventos — Sistema de Unidades y Métricas (NUEVO en V5.1)
- [x] `src/units/` — sistema de unidades (16 unidades en 5 dimensiones, conversión, badge)
- [x] Schema: columna `metrics` en `eventTypes`, columna `"values"` en `timelineEvents`
- [x] Seed de métricas para weight (kg), height (cm), temperature (°C), medication (mL)
- [x] Migración legacy `metadata.weightGrams` → `values.weight` (kg), `heightMm` → cm, `celsius` → °C
- [x] `EventMetricsEditor` en catálogos — editor de zonas de métrica por tipo de evento
- [x] Captura de métricas en `new.tsx` con selector de unidad (cm↔m, kg↔g, °C↔°F)
- [x] Display de valores con zonas de color en detalle (`[id].tsx`)
- [x] Estadísticas: agregación de métricas (avg/min/max) por tipo de evento en `/stats`
- [x] `useLastGrowthLog` lee de `values`, `metadata` legacy, y `growth_logs`
- [x] `useTheme()` en `new.tsx` (colores no hardcodeados)

### Fase 3.5 — UX/UI Cleanup
- [x] Header de EventMetricsEditor y ObservationForm homogéneos (← + título + 💾 Guardar)
- [x] Botón editar pasa de ⚙️ a ✏️ (⚙️ se mantiene como indicador de métricas)
- [x] Perfil bebé sin link a catálogos (solo settings)
- [x] Targets táctiles ≥44×44px (Apple HIG)
- [x] Unidades: gotas (drop), sobre (sachet) agregadas al registry

### Perfil del Bebé
- [x] `app/baby/profile.tsx` — datos + avatar picker (grid 30 emojis + cámara + galería)
- [x] Modo edición completo con DateTimePicker fix (raw string state)
- [x] KeyboardAvoidingView que no tapa inputs
- [x] Zona de desarrollo: reset total con doble confirmación
- [x] Compara peso/talla nacimiento vs último registrado (desde growth_logs + timeline)

### Estadísticas
- [x] `useStats.ts` — hook con comparación vs período anterior
- [x] `app/stats/index.tsx` — pantalla completa
- [x] Filtros: ☀️ Día / 📅 Semana / 🗓️ Mes / 📆 Año
- [x] Tomas, sueño, pañales, otros eventos (con métricas agregadas), crecimiento
- [x] Badges de delta (↑↓=) vs período anterior
- [x] Botón 📤 para compartir reporte desde stats

### Compartir Reporte
- [x] `shareReport.ts` — texto estructurado con formato WhatsApp-markdown
- [x] `shareSingleRecord()` — compartir 1 registro con/sin foto
- [x] `shareMultipleRecords()` — compartir N registros en secuencia
- [x] Con foto: imagen primero → delay 600ms → texto después

### Catálogos Custom
- [x] `app/settings/catalogs.tsx` — crear tipos de evento con métricas, observaciones custom
- [x] Editor de métricas por tipo de evento (nombre, unidad, dimensión, zonas de color)
- [x] `useCreateEventType`, `useCreateDiaperObservation` hooks

### Sistema de Temas (Fase 2 completa)
- [x] `src/theme/types.ts` — interfaz `AppTheme` con 30+ tokens de color
- [x] Temas light/dark por defecto
- [x] `ThemeProvider.tsx` — React Context
- [x] `useTheme.ts` — hook `const { theme } = useTheme()`
- [x] `themeStorage.ts` — persistencia en AsyncStorage
- [x] `app/settings/index.tsx` — lista de ajustes (⋮ → settings)
- [x] `app/settings/theme/index.tsx` — selector de temas con preview
- [x] `app/settings/theme/editor.tsx` — editor visual de temas
- [x] Migración de 17+ archivos a `useTheme()`
- [x] Sin `dark:` classNames — colores vía inline styles

### UI Components
| Componente | Descripción |
|---|---|
| `ActiveFeedingCard` | Card naranja — toma activa con timer |
| `ActiveSleepCard` | Card morada — siesta activa con timer |
| `AvatarPicker` | Modal: grid emojis + cámara + galería |
| `BigButton` | Botón principal (primary/secondary/ghost/growth) |
| `BottleSubtypeModal` | Sheet para elegir subtipo de biberón |
| `CatalogModals` | Modales para crear tipos custom |
| `DateTimePicker` | Selector fecha/hora con raw string state |
| `PoopOMeter` | Selector intensidad 0-5 |
| `TimelineBubbles` | Burbujas de evento, sesión, sueño, separador fecha |
| `SafeScreen` | Wrapper SafeAreaView + padding |
| `UnitBadge` | Badge de unidad de medida (kg, cm, °C...) |

---

## 🔴 PENDIENTE — Lo que falta

### FASE 3: Eventos con Métricas y Unidades ✅
> Implementado en V5.1

- [x] Sistema de unidades (`src/units/`)
- [x] Schema + migración (metrics, values)
- [x] Editor de métricas en catálogos
- [x] Captura de valores al crear evento (con selector de unidad)
- [x] Display de valores en detalle
- [x] Estadísticas de métricas
- [x] Limpieza y SITEMAP.md

### FASE 3.5: UX/UI CLEANUP ✅

- [x] ObservationForm header homogéneo (← + título + 💾 Guardar como EventMetricsEditor)
- [x] ✏️ editar (⚙️ se mantiene solo como indicador visual de métricas)
- [x] Unidades: gotas (drop), sobre (sachet) agregadas al registry
- [x] Targets táctiles ≥44px, perfil bebé sin link a catálogos

### FASE 4: REFINAMIENTOS UX

- [ ] **Auto-detect display unit** — mostrar en m si >100cm, en kg si >1000g, etc.
- [ ] **Nombre real del cuidador en burbujas** — Reemplazar "Otro cuidador" por nombre real
- [ ] **Curva de crecimiento** — Gráfica OMS con percentiles (peso, talla, cefálico)
- [ ] **Estadísticas: gráficas de tendencia** — Líneas de tendencia diaria/semanal con SVG

### FASE 5: LIMPIEZA TÉCNICA

- [ ] **Eliminar dead code V3**
  - `useDiaperLogs.ts` — importa tabla `diaperLogs` que ya no existe
  - `useFeedingLogs.ts` — importa tabla `feedingLogs` que ya no existe
  - `reportGenerator.ts` — importa tipo `DiaperLog` que ya no existe
  - `app/report/generate.tsx` — usa hooks V3 (reemplazado por stats)
- [ ] **Migración no-destructiva en `_layout.tsx`** — no dropear tablas existentes
- [ ] **Verificar TypeScript strict** — Corregir errores de tipado
- [ ] **`app/timeline/index.tsx`** — Eliminar placeholder (el dashboard ya es el timeline)

### FASE 6: NICE TO HAVE

- [ ] **Múltiples bebés** — schema lo soporta, falta UI de selección
- [ ] **Múltiples cuidadores** — schema lo soporta, falta sync
- [ ] **Notificaciones** — recordar cada X horas si no hay toma
- [ ] **Export CSV/PDF** del historial completo
- [ ] **Compartir múltiples imágenes** vía react-native-share
- [ ] **Estadísticas: curvas OMS** con percentiles
- [ ] **Onboarding segundo cuidador** vía QR
- [ ] **Tab bar** — Navegación principal con tabs (💬 Chat · 📊 Stats · ⚙️ Settings)

---

## 🏗️ ESTRUCTURA DE ARCHIVOS (V5.2)

```
cielo-app/
├── app/
│   ├── _layout.tsx              ← runMigrations + ThemeProvider
│   ├── index.tsx                ← Redirect según onboarding
│   ├── baby/profile.tsx         ← Perfil bebé + avatar picker
│   ├── dashboard/index.tsx      ← Timeline/chat principal + ⋮ menu + 📊 stats
│   ├── settings/
│   │   ├── index.tsx            ← Lista de ajustes
│   │   ├── catalogs.tsx         ← Catálogos custom + EventMetricsEditor
│   │   └── theme/
│   │       ├── index.tsx        ← Selector de tema
│   │       └── editor.tsx       ← Editor visual de temas
│   ├── logs/
│   │   ├── diaper/new.tsx
│   │   ├── event/[id].tsx       ← Detalle + display de métricas
│   │   ├── event/new.tsx        ← Crear evento + captura de métricas
│   │   ├── feeding/[id].tsx
│   │   ├── feeding/retro.tsx
│   │   ├── sleep/[id].tsx
│   │   └── growth/{new,history}.tsx
│   ├── stats/index.tsx          ← Estadísticas con agregación de métricas
│   ├── onboarding/{welcome,role,baby}.tsx
│   ├── report/generate.tsx
│   └── timeline/index.tsx       ← Placeholder (dead code)
├── src/
│   ├── units/                   ← NUEVO: sistema de unidades
│   │   ├── types.ts
│   │   ├── registry.ts          ← 14 unidades
│   │   ├── helpers.ts           ← convert, formatWithUnit
│   │   ├── UnitBadge.tsx
│   │   └── index.ts
│   ├── theme/                   ← Sistema de temas contextual
│   │   ├── types.ts
│   │   ├── themes/{light,dark}.ts
│   │   ├── ThemeProvider.tsx
│   │   ├── useTheme.ts
│   │   ├── useThemeStyles.ts
│   │   └── themeStorage.ts
│   ├── components/
│   │   ├── charts/              ← BarChart, AreaChart, GrowthLineChart
│   │   └── ui/                  ← BigButton, DateTimePicker, AvatarPicker...
│   ├── db/
│   │   ├── schema.ts            ← Columnas metrics y "values"
│   │   └── client.ts            ← seed de métricas + migración legacy
│   ├── hooks/
│   │   ├── useTimeline.ts       ← useSaveTimelineEvent soporta values
│   │   ├── useStats.ts          ← eventMetricAggs
│   │   └── useGrowthLogs.ts     ← lee de values + metadata + growth_logs
│   └── utils/...
```

---

## 🔢 ORDEN DE IMPLEMENTACIÓN (V5.2)

1. ✅ **Fase 1: Pantallas faltantes** — growth/new, growth/history, feeding/[id], sleep/[id], event/[id], feeding/retro, diaper/new, event/new
2. ✅ **Fase 1.5: Rediseño Pañal** — pipímetro/popómetro + observaciones multi-métrica
3. ✅ **Fase 2: Sistema de Tema Contextual + Settings** — types, provider, settings, gestor de temas, migración
4. ✅ **Fase 3: Eventos con Métricas y Unidades** — sistema de unidades, schema metrics/values, editor, captura, display, estadísticas
5. ✅ **Fase 3.5: UX/UI Cleanup** — cabeceras homogéneas, ⚙️→✏️, gotas/sobre, one-hand, catálogos solo settings
6. ⬜ **Fase 4: Refinamientos UX** — auto-detect unidades, nombre cuidador, curvas OMS, tendencias
7. ⬜ **Fase 5: Limpieza técnica** — dead code V3, TypeScript strict, timeline placeholder
8. ⬜ **Fase 6: Nice to have** — multi-bebé, notificaciones, export, tabs

---

## 🛠️ COMANDOS ÚTILES

```bash
# Desarrollo
npx expo start --android
npx expo start --clear        # reset cache Metro

# Reset datos en Android
adb shell run-as com.buscer.cieloapp rm /data/data/com.buscer.cieloapp/files/SQLite/cielo.db
adb shell pm clear com.buscer.cieloapp

# Build APK
eas build --profile preview --platform android

# Logs
adb logcat -s ReactNativeJS
```

---

## ⚙️ CONFIGURACIÓN

| Archivo | Nota |
|---|---|
| `app.json` | scheme: cieloaapp, newArchEnabled: true, userInterfaceStyle: dark |
| `eas.json` | npmFlags: --legacy-peer-deps, profile preview → APK |
| `tailwind.config.js` | Solo utilities de layout (no colores semánticos) |
| `global.css` | @tailwind base/components/utilities |

---

## LECCIONES TÉCNICAS (acumuladas V1→V5)

| Problema | Solución |
|---|---|
| `better-sqlite3` en dependencies → crash en device | Eliminar. Solo existe en drizzle-kit |
| `openDatabaseSync` a nivel de módulo con New Architecture | Mover dentro de runMigrations(), exportar getDb() lazy |
| `crypto.randomUUID()` no existe en Hermes | Usar `generateId()` propio |
| `expo-file-system` API legacy deprecada | Importar desde `expo-file-system/legacy` |
| `router.replace` en useEffect antes del mount | Mover a app/index.tsx con `<Redirect>` |
| Timer de toma ignoraba pausas | sumar segmentos activos con `calcDurationSec()` |
| DateTimePicker re-derivaba display del Date prop | Raw string state independiente por campo |
| EAS Build sin peer-deps | `--legacy-peer-deps` en eas.json |
| NativeWind v4 `dark:` variants no resuelven en prod | Migrar a React Context + inline styles para colores |
| pnpm no hoistea react-native-css-interop | Agregar como direct dependency + shamefully-hoist=true |
| SQLite `values` es palabra reservada | Usar `"values"` (con comillas) en raw SQL |
| `parseInt || 1` en inputs numéricos | Usar `v === '' ? 0 : parseInt(v) || 0` |

---

*Cielo App PLAN V5.1 · Actualizado post-Fase 3*
