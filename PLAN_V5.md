# 🌙 CIELO APP — PLAN MAESTRO V5 (Unificado)
> **Versión:** 5.0 · **Estado:** En desarrollo activo
> *"Hecho para los que velan de noche. Por Cielo."*

---

## 🗺️ VISIÓN DEL PRODUCTO

App de seguimiento de bebé para cuidadores. Modelo mental: el grupo de WhatsApp donde se mandaban mensajes tipo "ya lo amamanté", "hice cambio de pañal", "durmió 2h". La app replica esa dinámica con una **timeline tipo chat** donde todos los cuidadores ven el mismo registro.

**Offline-first, privacidad total, cero dependencia de servidor.**

---

## ✅ LO QUE YA FUNCIONA (V4.2)

### Infraestructura
- [x] Expo SDK 54, React Native 0.81.5, New Architecture habilitada
- [x] expo-sqlite + Drizzle ORM (patrón lazy `getDb()`)
- [x] TanStack Query v5 con invalidaciones por mutation
- [x] NativeWind v4 + Tailwind v3 + Reanimated v4
- [x] expo-router con Redirect desde `app/index.tsx`
- [x] `generateId()` propio (Hermes-safe)
- [x] EAS Build con `--legacy-peer-deps`

### Base de Datos — Schema V4.2
| Tabla | Descripción |
|---|---|
| `profiles` | Cuidadores con rol (mamá/papá/abue/nanny/bestie) |
| `babies` | Perfil del bebé con avatar_emoji, photo_uri, nick, sexo, estado |
| `event_types` | Catálogo default + custom (pañal, eructo, vomito, peso...) |
| `diaper_observations` | Catálogo default + custom (sangre, mucosidad, diarrea...) |
| `feeding_sessions` | Tomas con estados y timeline de eventos |
| `feeding_status_events` | Eventos de cambio de estado de toma (auditoría) |
| `sleep_sessions` | Siestas con estados (independientes de tomas) |
| `sleep_status_events` | Eventos de cambio de estado de siesta |
| `growth_logs` | Registros de peso/estatura/céfalo (enteros g/mm) |
| `timeline_events` | Timeline unificado de todos los eventos |

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

### Pañales
- [x] `app/logs/diaper/new.tsx` con PoopOMeter (intensidad 0-5)
- [x] Selección de observaciones (sangre, mucosidad, diarrea, verde, grumoso)
- [x] Alerta visual si hay observaciones médicas
- [x] Auto-pausa de toma activa al registrar pañal
- [x] Vinculación a sesión de toma activa
- [x] Foto del pañal (cámara o galería) con preview

### Otros Eventos
- [x] Modal de selección de tipo de evento
- [x] `app/logs/event/new.tsx` — evento genérico con metadata
- [x] Eventos vinculados a toma activa
- [x] Eructo, regurgitación, vómito, medicamento, peso, estatura, temperatura, nota

### Perfil del Bebé
- [x] `app/baby/profile.tsx` — datos + avatar picker (grid 30 emojis + cámara + galería)
- [x] Modo edición completo con DateTimePicker fix (raw string state)
- [x] KeyboardAvoidingView que no tapa inputs
- [x] Zona de desarrollo: reset total con doble confirmación

### Estadísticas
- [x] `useStats.ts` — hook con comparación vs período anterior
- [x] `app/stats/index.tsx` — pantalla completa
- [x] Filtros: ☀️ Día / 📅 Semana / 🗓️ Mes / 📆 Año
- [x] Tomas, sueño, pañales, otros eventos, crecimiento
- [x] Badges de delta (↑↓=) vs período anterior
- [x] Botón 📤 para compartir reporte desde stats

### Compartir Reporte
- [x] `shareReport.ts` — texto estructurado con formato WhatsApp-markdown
- [x] `shareSingleRecord()` — compartir 1 registro con/sin foto
- [x] `shareMultipleRecords()` — compartir N registros en secuencia
- [x] Con foto: imagen primero → delay 600ms → texto después

### Catálogos Custom
- [x] `app/settings/catalogs.tsx` — crear tipos de evento y observaciones custom
- [x] `useCreateEventType`, `useCreateDiaperObservation` hooks

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

---

## 🔴 PENDIENTE — Lo que falta

### FASE 1: PANTALLAS FALTANTES (Stack navigation)

- [ ] **`app/logs/feeding/retro.tsx`** — Toma rezagada
  - Picker de tipo + subtipo + DateTimePicker inicio/fin
  - Calcular y guardar `durationSec`
  - Insertar en timeline en posición correcta

- [ ] **`app/logs/feeding/[id].tsx`** — Detalle de toma
  - Header con tipo, hora inicio→fin, duración
  - Timeline interna de eventos durante la toma
  - Botón editar hora inicio/fin

- [ ] **`app/logs/sleep/[id].tsx`** — Detalle de siesta
  - Similar al detalle de toma

- [ ] **`app/logs/event/[id].tsx`** — Detalle de evento genérico
  - Mostrar metadata según tipo de evento

- [ ] **`app/logs/growth/new.tsx`** — Registro de crecimiento
  - Peso (kg), estatura (cm), circunferencia cefálica (cm)
  - Al menos un campo requerido

- [ ] **`app/logs/growth/history.tsx`** — Historial de crecimiento
  - Tabla cronológica con últimos registros
  - Mini estadísticas (progreso desde el nacimiento)

### FASE 2: REFINAMIENTO UX

- [ ] **Curva de crecimiento** — Gráfica simple con `react-native-svg` (ya instalado)
- [ ] **Tab bar** — Navegación principal con tabs (💬 Chat · 📊 Stats · ⚙️ Settings)
- [ ] **Nombre real del cuidador en burbujas** — Reemplazar "Otro cuidador" por nombre real
- [ ] **Estadísticas: gráficas de tendencia** — Líneas de tendencia diaria/semanal con SVG
- [ ] **Pantalla de configuración** — unificar settings (catálogos, perfiles, ajustes)

### FASE 3: LIMPIEZA TÉCNICA

- [ ] **Eliminar dead code V3**
  - `useDiaperLogs.ts` — importa tabla `diaperLogs` que ya no existe
  - `useFeedingLogs.ts` — importa tabla `feedingLogs` que ya no existe
  - `reportGenerator.ts` — importa tipo `DiaperLog` que ya no existe
  - `app/report/generate.tsx` — usa hooks V3 (reemplazado por stats)

- [ ] **Migración no-destructiva en `_layout.tsx`**
  - No dropear tablas existentes al detectar schema viejo
  - Usar ALTER TABLE con try/catch como el resto del código

- [ ] **Verificar TypeScript strict** — Corregir errores de tipado

- [ ] **`app/timeline/index.tsx`** — Eliminar placeholder (el dashboard ya es el timeline)

### FASE 4: NICE TO HAVE

- [ ] **Múltiples bebés** — schema lo soporta, falta UI de selección
- [ ] **Múltiples cuidadores** — schema lo soporta, falta sync
- [ ] **Notificaciones** — recordar cada X horas si no hay toma
- [ ] **Export CSV/PDF** del historial completo
- [ ] **Tema oscuro** (ya es dark, pero tener variante light opcional)
- [ ] **Compartir múltiples imágenes** vía react-native-share
- [ ] **Estadísticas: curvas OMS** con percentiles
- [ ] **Onboarding segundo cuidador** vía QR

---

## 🧱 ARQUITECTURA

### Flujo de navegación
```
App Launch → _layout.tsx (runMigrations)
  → app/index.tsx (check onboarding_done)
    → NO: /onboarding/welcome → /onboarding/role → /onboarding/baby → /dashboard
    → SÍ: /dashboard
```

### Estructura de archivos
```
cielo-app/
├── app/
│   ├── _layout.tsx              ← runMigrations lazy + providers
│   ├── index.tsx                ← Redirect según onboarding
│   ├── baby/profile.tsx         ← Perfil bebé + avatar picker
│   ├── dashboard/index.tsx      ← Timeline/chat principal
│   ├── logs/
│   │   ├── diaper/new.tsx       ← ✅ Pañal + foto
│   │   ├── event/new.tsx        ← ✅ Evento genérico
│   │   ├── event/[id].tsx       ← ⏳ Detalle evento
│   │   ├── feeding/retro.tsx    ← ⏳ Toma rezagada
│   │   ├── feeding/[id].tsx     ← ⏳ Detalle toma
│   │   ├── growth/new.tsx       ← ⏳ Peso/estatura
│   │   ├── growth/history.tsx   ← ⏳ Historial crecimiento
│   │   └── sleep/[id].tsx       ← ⏳ Detalle siesta
│   ├── onboarding/              ← ✅ Flujo completo
│   ├── settings/catalogs.tsx    ← ✅ Catálogos custom
│   ├── stats/index.tsx          ← ✅ Stats completas
│   ├── report/generate.tsx      ← 🟡 Legacy V3 (reemplazar)
│   └── timeline/index.tsx       ← 🟡 Placeholder (eliminar)
├── src/
│   ├── components/
│   │   ├── charts/              ← ✅ SVG charts components
│   │   └── ui/                  ← ✅ 10+ componentes
│   ├── db/
│   │   ├── client.ts            ← ✅ getDb() lazy + migraciones
│   │   ├── migrations/          ← ⏳ Migraciones SQL
│   │   └── schema.ts            ← ✅ V4.2 completo
│   ├── hooks/                   ← ✅ Todos V4 menos dead code
│   ├── services/                ← ✅ imageStorage, reportGenerator
│   └── utils/                   ← ✅ id, shareReport
```

### Stack técnico
| Capa | Tecnología |
|---|---|
| Framework | Expo SDK 54, React 19, RN 0.81.5 |
| Routing | expo-router (file-based) |
| DB | expo-sqlite + Drizzle ORM |
| Cache/Estado | TanStack React Query v5 |
| Estilo | NativeWind v4 + Tailwind v3 |
| Animación | react-native-reanimated v4 |
| Cámara | expo-image-picker |
| Archivos | expo-file-system |
| Compartir | expo-sharing + RN Share |
| Build | EAS Build (Android APK) |

---

## 🔢 ORDEN DE IMPLEMENTACIÓN

1. **Pantallas faltantes** — growth/new, growth/history (mayor impacto)
2. **Detalles** — feeding/[id], sleep/[id], event/[id] (UX completa)
3. **Toma rezagada** — feeding/retro (muy pedida en la vida real)
4. **Tab bar** — navegación con tabs en lugar de header lleno de botones
5. **Dead code** — eliminar useDiaperLogs, useFeedingLogs, reportGenerator v3
6. **Migración no-destructiva** — _layout.tsx sin DROP TABLE
7. **Refinamientos** — curvas de crecimiento, gráficas tendencia
8. **Multi-bebé y sync** — fases v2.0+

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
| `tailwind.config.js` | Paleta dark personalizada (bg/text/cielo/pink/...) |
| `global.css` | @tailwind base/components/utilities |
| `opencode.json` | skills.paths → .opencode/skills |

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

---

*Cielo App PLAN V5 · Unifica V3 + V4.2 + tareas pendientes*
