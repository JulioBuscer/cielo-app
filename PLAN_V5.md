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

### Pañales (v1)
- [x] `app/logs/diaper/new.tsx` con PoopOMeter (intensidad 0-5)
- [x] Selección de observaciones (sangre, mucosidad, diarrea, verde, grumoso)
- [x] Alerta visual si hay observaciones médicas
- [x] Auto-pausa de toma activa al registrar pañal
- [x] Vinculación a sesión de toma activa
- [x] Foto del pañal (cámara o galería) con preview
- [x] `app/logs/event/new.tsx` — Evento genérico con selector de tipo, notas, datetime
- [ ] **[REDISEÑO →](./DIAPER-REDESIGN.md)** Separar cantidad/salud pipí/popó + observaciones multi-métrica

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
- [x] Se mantiene tal cual en la nueva navegación

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

### FASE 1: PANTALLAS FALTANTES (Stack navigation) ✅

- [x] **`app/logs/diaper/new.tsx`** — Pañal con PoopOMeter, observaciones, foto (antes marcado ✅ pero no existía)
- [x] **`app/logs/event/new.tsx`** — Evento genérico con preselect param (antes marcado ✅ pero no existía)
- [x] **`app/logs/feeding/retro.tsx`** — Toma rezagada
  - Picker de tipo + subtipo + DateTimePicker inicio/fin
  - Calcular y guardar `durationSec`
  - Inserta feeding_session con status 'finished'
- [x] **`app/logs/feeding/[id].tsx`** — Detalle de toma
  - Header con tipo, hora inicio→fin, duración
  - Timeline interna de eventos durante la toma
  - Botón editar hora inicio/fin
- [x] **`app/logs/sleep/[id].tsx`** — Detalle de siesta
  - Similar al detalle de toma
- [x] **`app/logs/event/[id].tsx`** — Detalle de evento genérico
  - Mostrar metadata según tipo de evento
- [x] **`app/logs/growth/new.tsx`** — Registro de crecimiento
  - Peso (kg), estatura (cm), circunferencia cefálica (cm)
  - Al menos un campo requerido
- [x] **`app/logs/growth/history.tsx`** — Historial de crecimiento
  - Tabla cronológica con últimos registros
  - Mini estadísticas (progreso desde el nacimiento)

### FASE 1.5: REDISEÑO PAÑAL — Pipímetro + Popómetro + Multi-métrica ✅
> 📄 **[Plan detallado → DIAPER-REDESIGN.md](./DIAPER-REDESIGN.md)**

- [x] **Schema**: columna `metrics` en `diaper_observations`, migrar datos viejos
- [x] **Metadata**: `peeHealth`/`poopHealth` + multi-métrica `observationValues`
- [x] **Settings**: secciones Pipí y Popó (intensidad + salud) + editor multi-métrica
- [x] **Formulario pañal**: pipímetro, popómetro, métricas inline, peso
- [x] **Event detail**: mostrar salud con colores/emojis resueltos
- [x] **Share/Stats**: actualizar reportes y estadísticas

### FASE 2: SISTEMA DE TEMA + REESTRUCTURACIÓN NAVEGACIÓN
> 📄 **[Plan detallado → THEME-SYSTEM.md](./THEME-SYSTEM.md)**

**Problema:** NativeWind v4 + `darkMode: 'class'` + `dark:` variants no funciona en producción. Las variantes `dark:` no se resuelven aunque el wrapper `className="dark"` esté presente.

**Solución:** Abandonar `dark:` variants de NativeWind. Migrar a **sistema de temas propio con React Context + inline styles**, que funciona siempre, es predecible, y permite temas editables por el usuario.

#### FASE 2.1: Infraestructura de Tema Contextual (nueva)

- [ ] **`src/theme/types.ts`** — interfaz `AppTheme` con todos los tokens de color
- [ ] **`src/theme/themes/light.ts`** — tema claro
- [ ] **`src/theme/themes/dark.ts`** — tema oscuro
- [ ] **`src/theme/ThemeProvider.tsx`** — React Context que provee el tema activo + setter
- [ ] **`src/theme/useTheme.ts`** — hook `useTheme()` → `colors` (los valores directos)
- [ ] **`src/theme/useThemeStyles.ts`** — hook `useThemeStyles(fn)` → memoiza StyleSheet por tema
- [ ] **`src/theme/themeStorage.ts`** — load/save themes en AsyncStorage
- [ ] **Reemplazar `src/hooks/useTheme.tsx`** — el ThemeProvider actual (className="dark") desaparece, el nuevo provee colores via context

#### FASE 2.2: Settings como pantalla de lista (estilo WhatsApp)

- [ ] **Tres puntitos (⋮) en dashboard header** → abre settings
- [ ] **`app/settings/index.tsx`** — pantalla principal de ajustes con lista:
  - 📝 Catálogos (eventos, pipí, popó, obs. pañal)
  - 🎨 Gestor de temas
  - 👤 Perfil del bebé
  - 👥 Cuidadores
  - ℹ️ Acerca de / Versión

- [ ] **Mover `catalogs.tsx`** como sub-pantalla de settings

#### FASE 2.3: Gestor de Temas (editor + selector)

- [ ] **`app/settings/theme/index.tsx`** — lista de temas disponibles (Light, Dark, custom)
- [ ] **`app/settings/theme/editor.tsx`** — editor visual de tema:
  - Paletas de colores por token (surface, card, textBody, accent, headerBg...)
  - Vista previa en vivo
  - Guardar como nuevo tema / sobrescribir
- [ ] **Selector de tema** en settings principal
- [ ] **Persistencia** en AsyncStorage + carga al inicio

#### FASE 2.4: Migración progresiva de componentes

- [ ] **Migrar `TimelineBubbles.tsx`** — de className tokens → `const theme = useTheme()`
- [ ] **Migrar `dashboard/index.tsx`**
- [ ] **Migrar `app/settings/`** (catalogs + theme screens)
- [ ] **Migrar `app/logs/`** (event/[id], feeding/[id], sleep/[id], growth/*, diaper/new)
- [ ] **Migrar `app/stats/index.tsx`**
- [ ] **Migrar componentes UI restantes** (ActiveFeedingCard, ActiveSleepCard, etc.)
- [ ] **Migrar `_layout.tsx`** (splash screen)

**Nota:** Se mantienen NativeWind utilities para layout (padding, margin, gap, flex, border-radius, font-size, font-weight). Solo los **colores** se mueven a inline styles con `useTheme()`.

#### FASE 2.5: Limpieza

- [ ] **Eliminar `tailwind.config.js` colors** — ya no necesitamos tokens semánticos ahí
- [ ] **Eliminar `dark:` classNames** de todos los archivos
- [ ] **Eliminar `darkMode: 'class'`** de tailwind.config.js
- [ ] **Mantener NativeWind** para utilities no-color

### FASE 3: REFINAMIENTOS UX

- [ ] **Curva de crecimiento** — Gráfica simple con `react-native-svg`
- [ ] **Nombre real del cuidador en burbujas** — Reemplazar "Otro cuidador" por nombre real
- [ ] **Estadísticas: gráficas de tendencia** — Líneas de tendencia diaria/semanal con SVG
- [ ] **Tab bar** — Navegación principal con tabs (💬 Chat · 📊 Stats · ⚙️ Settings) (opcional, después de fase 2)

### FASE 4: LIMPIEZA TÉCNICA

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

### FASE 5: NICE TO HAVE

- [ ] **Múltiples bebés** — schema lo soporta, falta UI de selección
- [ ] **Múltiples cuidadores** — schema lo soporta, falta sync
- [ ] **Notificaciones** — recordar cada X horas si no hay toma
- [ ] **Export CSV/PDF** del historial completo
- [ ] **Compartir múltiples imágenes** vía react-native-share
- [ ] **Estadísticas: curvas OMS** con percentiles
- [ ] **Onboarding segundo cuidador** vía QR

---

## 🏗️ PLAN DE IMPLEMENTACIÓN — SISTEMA DE TEMA CONTEXTUAL

### Arquitectura

```
src/theme/
├── types.ts           → AppTheme interface (todos los tokens)
├── themes/
│   ├── light.ts       → Tema claro default
│   └── dark.ts        → Tema oscuro default
├── ThemeProvider.tsx   → React Context provider
├── useTheme.ts        → Hook: const theme = useTheme()
├── useThemeStyles.ts  → Hook: const styles = useThemeStyles((t) => StyleSheet.create({...}))
└── themeStorage.ts    → AsyncStorage CRUD

app/settings/
├── index.tsx          → Lista de ajustes (nueva)
└── theme/
    ├── index.tsx      → Selector de tema
    └── editor.tsx     → Editor visual de temas
```

### Interfaz AppTheme

```ts
interface AppTheme {
  id: string;
  name: string;
  isBuiltIn: boolean;
  colors: {
    // Superficies
    surface: string;
    card: string;
    elevated: string;
    inputBg: string;
    // Texto
    textBody: string;
    textMuted: string;
    textDim: string;
    textOnAccent: string;
    // Acento
    accent: string;
    accentStrong: string;
    accentLight: string;
    // Header
    headerBg: string;
    headerText: string;
    // Bordes
    border: string;
    // Timeline
    bubbleOwn: string;
    bubbleOther: string;
    // Estados
    success: string;
    warning: string;
    danger: string;
    // Colores fijos (no cambian con tema)
    biological: { pee: string; poop: string };
    feeding: { bottle: string; breast: string };
    growth: string;
  };
}
```

### Flujo de uso en componentes

```tsx
// Antes (NativeWind con dark:)
<View className="bg-surface dark:bg-surface p-4 rounded-xl">
  <Text className="text-textBody dark:text-textBody font-bold">Hola</Text>
</View>

// Después (Context + inline styles)
function MiComponente() {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 12 }}>
      <Text style={{ color: colors.textBody, fontWeight: 'bold' }}>Hola</Text>
    </View>
  );
}

// O con useThemeStyles (estilo StyleSheet)
function MiComponente() {
  const styles = useThemeStyles((t) => StyleSheet.create({
    container: { backgroundColor: t.surface, padding: 16, borderRadius: 12 },
    title: { color: t.textBody, fontWeight: 'bold' },
  }));
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hola</Text>
    </View>
  );
}
```

### Orden de implementación

1. **`src/theme/types.ts`** + temas light/dark
2. **`ThemeProvider.tsx`** + `useTheme.ts` + `themeStorage.ts`
3. **`useThemeStyles.ts`** — hook memoizado
4. **Reemplazar `useTheme.tsx`** (el actual) con el nuevo ThemeProvider
5. **Migrar 1 componente** (ej. TimelineBubbles) para validar el approach
6. **Crear `app/settings/index.tsx`** con lista de opciones
7. **Agregar ⋮ en dashboard header** → navega a settings
8. **Mover catalogs.tsx** como sub-pantalla de settings
9. **Crear gestor de temas** (selector + editor)
10. **Migrar resto de componentes** progresivamente

---

## 🧱 ARQUITECTURA

### Flujo de navegación (después de Fase 2)
```
App Launch → _layout.tsx (runMigrations + ThemeProvider)
  → app/index.tsx (check onboarding_done)
    → NO: /onboarding/welcome → /onboarding/role → /onboarding/baby → /dashboard
    → SÍ: /dashboard
      → Header ⋮ → /settings (lista)
        → /settings/catalogs
        → /settings/theme
        → /baby/profile
```

### Estructura de archivos (después de Fase 2)
```
cielo-app/
├── app/
│   ├── _layout.tsx              ← runMigrations lazy + ThemeProvider
│   ├── index.tsx                ← Redirect según onboarding
│   ├── baby/profile.tsx         ← Perfil bebé + avatar picker
│   ├── dashboard/index.tsx      ← Timeline/chat principal + ⋮ menu
│   ├── settings/
│   │   ├── index.tsx            ← Lista de ajustes (NUEVA)
│   │   ├── catalogs.tsx         ← Catálogos custom (movido)
│   │   └── theme/
│   │       ├── index.tsx        ← Selector de tema (NUEVA)
│   │       └── editor.tsx       ← Editor de temas (NUEVA)
│   ├── logs/...
│   ├── onboarding/...
│   ├── stats/...
│   └── timeline/...
├── src/
│   ├── theme/                   ← NUEVO: sistema de temas contextual
│   │   ├── types.ts
│   │   ├── themes/
│   │   ├── ThemeProvider.tsx
│   │   ├── useTheme.ts
│   │   ├── useThemeStyles.ts
│   │   └── themeStorage.ts
│   ├── components/...
│   ├── db/...
│   ├── hooks/...
│   └── utils/...
```

### Stack técnico
| Capa | Tecnología |
|---|---|
| Framework | Expo SDK 54, React 19, RN 0.81.5 |
| Routing | expo-router (file-based) |
| DB | expo-sqlite + Drizzle ORM |
| Cache/Estado | TanStack React Query v5 |
| Estilo (layout) | NativeWind v4 + Tailwind v3 (padding, margin, flex, etc.) |
| **Estilo (colores)** | **React Context + inline styles / StyleSheet** (NUEVO) |
| Animación | react-native-reanimated v4 |
| Cámara | expo-image-picker |
| Archivos | expo-file-system |
| Compartir | expo-sharing + RN Share |
| Build | EAS Build (Android APK) |
| **Tema** | **React Context + AsyncStorage** (NUEVO) |

---

## 🔢 ORDEN DE IMPLEMENTACIÓN (actualizado)

1. ✅ **Fase 1: Pantallas faltantes** — growth/new, growth/history, feeding/[id], sleep/[id], event/[id], feeding/retro, diaper/new, event/new
2. ✅ **Fase 1.5: [Rediseño Pañal](./DIAPER-REDESIGN.md)** — pipímetro/popómetro + observaciones multi-métrica
3. **FASE 2: [Sistema de Tema Contextual + Settings](./THEME-SYSTEM.md)**
   - 2.1 Infraestructura de tema (types, provider, hooks, storage)
   - 2.2 Settings como pantalla de lista (⋮ → settings)
   - 2.3 Gestor de temas (selector + editor visual)
   - 2.4 Migración progresiva de componentes (className → useTheme)
   - 2.5 Limpieza (dark: classNames, tailwind colors)
4. **Fase 3: Refinamientos UX** — curvas de crecimiento, gráficas, nombre cuidador
5. **Fase 4: Dead code + limpieza técnica**
6. **Fase 5: Multi-bebé, notificaciones, export**

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
| `tailwind.config.js` | Solo utilities de layout (no colores semánticos) después de Fase 2 |
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
| **NativeWind v4 `dark:` variants no resuelven en prod** | **Migrar a React Context + inline styles para colores** |

---

*Cielo App PLAN V5 · Unifica V3 + V4.2 + tareas pendientes*
