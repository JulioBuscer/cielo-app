# CIELO APP — PLAN MAESTRO V4.3
> **Última actualización:** Sesión actual — Stats, compartir reporte, sueño, avatar, fix DateTimePicker, KeyboardAvoidingView, foto en pañal
> **Estado:** En desarrollo activo

---

## 🗺️ VISIÓN DEL PRODUCTO

App de seguimiento de bebé para papá + mamá. Modelo mental: el grupo de WhatsApp donde se mandaban mensajes tipo "ya lo amamanté", "hice cambio de pañal", "durmió 2h". La app replica esa dinámica con una **timeline tipo chat** donde ambos cuidadores ven el mismo registro en tiempo real.

---

## ✅ COMPLETADO — Lo que ya funciona

### INFRAESTRUCTURA
- [x] Expo SDK 54, React Native 0.81.5, New Architecture habilitada
- [x] expo-sqlite + Drizzle ORM (patrón lazy `getDb()` — crítico para New Architecture)
- [x] TanStack Query v5 con invalidaciones por mutation
- [x] NativeWind v4 + Reanimated v4
- [x] expo-router con Redirect desde `app/index.tsx`
- [x] EAS Build con `--legacy-peer-deps`
- [x] `generateId()` propio (sin `crypto.randomUUID()` que no existe en Hermes)
- [x] Reset de datos para desarrollo (doble confirmación + ADB)

### BASE DE DATOS — Schema V4.2
- [x] `profiles` — cuidadores con rol
- [x] `babies` — perfil del bebé con avatar_emoji, photo_uri, peso/talla, sexo, estado
- [x] `event_types` — catálogo default + custom
- [x] `diaper_observations` — catálogo default + custom
- [x] `feeding_sessions` + `feeding_status_events` — tomas con estados
- [x] `sleep_sessions` + `sleep_status_events` — siestas con estados ← **NUEVO**
- [x] `timeline_events` — todos los eventos vinculables a toma o siesta
- [x] Migraciones ALTER TABLE con try/catch (sin IF NOT EXISTS en SQLite)
- [x] Seed de datos default en runMigrations

### ONBOARDING
- [x] `welcome.tsx` — pantalla de bienvenida
- [x] `role.tsx` — selección de rol (mamá/papá/abuela/nanny/bestie)
- [x] `baby.tsx` — nombre, apodo, sexo, fecha/hora nacimiento, avatar emoji/foto

### DASHBOARD (Timeline/Chat)
- [x] FlatList invertida (más reciente abajo, scroll hacia arriba para historial)
- [x] Header estilo WhatsApp con avatar dinámico del bebé
- [x] Botones de acción rápida: 🤱 Izq · 🤱 Der · 😴 Dormir · 🍼 Biberón · 🍑 Pañal · ➕ Evento
- [x] `ActiveFeedingCard` — toma activa con timer preciso y controles pausa/continuar/terminar
- [x] `ActiveSleepCard` — siesta activa con timer y controles ← **NUEVO**
- [x] Ambas cards visibles simultáneamente si hay toma + sueño al mismo tiempo ← **NUEVO**
- [x] El status del bebé en header muestra "🍼 Comiendo · 😴 Durmiendo" si aplica
- [x] Input de nota rápida con botón verde WhatsApp
- [x] Modal de selección de evento + botón para crear tipo custom
- [x] Modal de subtipo de biberón
- [x] KeyboardAvoidingView — el teclado no tapa la barra de acciones ← **NUEVO**
- [x] Botón 📊 en header → pantalla de estadísticas ← **NUEVO**

### TOMAS DE LECHE
- [x] Iniciar toma (pecho izq/der/biberón con subtipo)
- [x] Pausar / Continuar / Terminar
- [x] Auto-finish de toma anterior al iniciar nueva
- [x] Timer preciso basado en `feeding_status_events` (suma de segmentos activos)
- [x] Historial de tomas en timeline
- [x] Burbujas de sesión terminada en el chat

### SESIONES DE SUEÑO ← **NUEVO COMPLETO**
- [x] `useSleepSessions.ts` — hooks start/pause/resume/finish/timer
- [x] `ActiveSleepCard.tsx` — card morada con timer preciso
- [x] El bebé puede comer y dormir simultáneamente (sesiones independientes)
- [x] Auto-finish de siesta anterior al iniciar nueva
- [x] Timer preciso igual que tomas (suma de segmentos activos)
- [x] `SleepSessionBubble` en timeline

### PAÑALES
- [x] Pantalla de registro con PoopOMeter (intensidad 0–5)
- [x] Selección de observaciones (Sangre, Mucosidad, Diarrea, Verde, Grumoso)
- [x] Alerta visual si hay observaciones médicas
- [x] Auto-pausa de toma activa al registrar pañal
- [x] Vinculación a sesión de toma activa
- [x] **Foto del pañal** (cámara o galería) ← **NUEVO**
- [x] Preview de imagen con opción de quitar
- [x] `imageUri` guardado en metadata JSON

### OTROS EVENTOS
- [x] Modal de selección de tipo de evento
- [x] Pantalla de evento genérico con metadata
- [x] Eventos vinculados a toma activa
- [x] Eructo, Regurgitación, Vómito, Medicamento, Peso, Estatura, Temperatura, Nota

### PERFIL DEL BEBÉ
- [x] Vista de datos (edad, nombre, apodo, sexo, estado, talla/peso al nacer)
- [x] Modo edición completo
- [x] **Avatar picker** — grid de 30 emojis + cámara + galería ← **NUEVO**
- [x] El avatar dinámico aparece en el header del dashboard y del perfil
- [x] **DateTimePicker fix** — raw string state por campo, sin re-derivar del Date prop ← **NUEVO**
  - Toca el campo → se borra → escribes el valor completo → onBlur aplica
  - Ya puedes escribir "54" en minutos, "10" en día, sin que se quede en "05"
- [x] **KeyboardAvoidingView** — el teclado no tapa los inputs ← **NUEVO**
- [x] Peso y talla con estado string + decimal-pad → conversión solo al guardar
- [x] Zona de desarrollo: reset total con doble confirmación

### ESTADÍSTICAS ← **NUEVO COMPLETO**
- [x] `useStats.ts` — hook con comparación vs período anterior
- [x] Pantalla `app/stats/index.tsx`
- [x] Filtros: ☀️ Día / 📅 Semana / 🗓️ Mes / 📆 Año
- [x] Navegador ‹ › entre períodos + "Ir al actual"
- [x] **Tomas**: sesiones, tiempo total, promedio, barras por tipo (%) con subtipos de biberón
- [x] **Sueño**: siestas, tiempo total, promedio, barra de % del día (en vista Día)
- [x] **Pañales**: cambios, con popó, fotos, barras intensidad pipí/popó
- [x] **Otros eventos**: lista ordenada por frecuencia
- [x] Badges de delta (↑↓=) en cada sección vs período anterior
- [x] Tablas de comparación con flechas y porcentaje de cambio
- [x] Aviso de cuántas fotos de pañal se incluirán al compartir
- [x] Botón 📊 en header del dashboard → navega a `/stats`

### COMPARTIR REPORTE ← **NUEVO COMPLETO**
- [x] `src/utils/shareReport.ts`
- [x] Texto estructurado con formato WhatsApp-markdown (*negrita*, separadores ━━)
- [x] Incluye: tomas por tipo con %, sueño, pañales con intensidades, otros eventos
- [x] Comparativas vs período anterior con flechas y %
- [x] **Sin imágenes** → `Share.share()` nativo directo (texto llega a WhatsApp)
- [x] **Con fotos de pañal** → copia archivos a `cacheDirectory` con nombres legibles, comparte .txt primero y luego cada imagen vía `expo-sharing`
- [x] Las fotos NUNCA salen del dispositivo sin que el usuario lo elija explícitamente
- [x] Botón verde 📤 en header de stats y botón grande al fondo de la pantalla

---

## 🔧 COMPONENTES UI ACTUALES

| Archivo | Descripción |
|---------|-------------|
| `ActiveFeedingCard.tsx` | Card naranja — toma activa, timer preciso, pausa/continuar/terminar |
| `ActiveSleepCard.tsx` | Card morada — siesta activa, timer preciso, pausa/continuar/despertar ← NUEVO |
| `AvatarPicker.tsx` | Modal: grid de emojis + cámara + galería ← NUEVO |
| `BigButton.tsx` | Botón principal reutilizable |
| `BottleSubtypeModal.tsx` | Sheet para elegir subtipo de biberón antes de iniciar toma |
| `CatalogModals.tsx` | Modales para crear tipos de evento custom |
| `DateTimePicker.tsx` | Selector de fecha/hora con raw string state (fix de input) ← NUEVO |
| `PoopOMeter.tsx` | Selector de intensidad 0–5 para pañales |
| `TimelineBubbles.tsx` | `TimelineBubble`, `FeedingSessionBubble`, `SleepSessionBubble`, `DateSeparator` |

---

## 🎨 PALETA DE COLORES

| Token | Valor | Uso |
|-------|-------|-----|
| bg | #FFF0F5 | Fondo general |
| header | #FF8AB3 | Header y StatusBar |
| cielo | #FF5C9A | Acento principal |
| bubbleOut | #FFB7D5 | Burbujas del usuario |
| bubbleIn | #FFFFFF | Burbujas del otro cuidador |
| bottle | #A855F7 | Biberón |
| diaper | #F59E0B | Pañal |
| sleep | #6366F1 | Sueño/siesta ← NUEVO |
| whatsGreen | #25D366 | Botón enviar / compartir |
| textPrimary | #2D1B26 | Texto principal |
| textMuted | #9B7A88 | Labels y texto secundario |

---

## 🧱 LECCIONES TÉCNICAS CRÍTICAS

| Problema | Solución |
|---------|----------|
| `openDatabaseSync` a nivel de módulo con New Architecture | Mover dentro de `runMigrations()`, exportar `getDb()` lazy |
| `crypto.randomUUID()` no existe en Hermes | Usar `generateId()` de `src/utils/id.ts` |
| `expo-file-system` API legacy deprecada | Importar desde `expo-file-system/legacy` |
| `router.replace` en useEffect antes del mount | Mover a `app/index.tsx` con `<Redirect>` |
| Timer de toma ignoraba pausas | Sumar segmentos activos (start/resume → pause/finish) con `calcDurationSec()` |
| Botones no responden tras pausa larga | `staleTime: 0` + `invalidateQueries` por mutation |
| `ALTER TABLE` falla si columna existe | try/catch por cada statement (SQLite sin IF NOT EXISTS para columnas) |
| **DateTimePicker re-derivaba display del Date prop** | Raw string state independiente por campo — el Date se aplica en onBlur ← NUEVO |
| EAS Build sin peer-deps | `"npm": { "npmFlags": "--legacy-peer-deps" }` en eas.json |

---

## 📋 PENDIENTE — Lo que falta

### 🔴 CRÍTICO / UX básica que falta

- [ ] **Toma rezagada** — `app/logs/feeding/retro.tsx` existe como placeholder
  - Picker de tipo + subtipo
  - DateTimePicker de hora inicio + hora fin
  - Calcular y guardar `durationSec`
  - Insertar en historial en la posición correcta de la timeline

- [ ] **Detalle de toma** — al tocar una burbuja de sesión en el chat
  - `app/logs/feeding/[id].tsx` existe como placeholder
  - Header con tipo, hora inicio → fin, duración
  - Timeline interna con eventos que ocurrieron durante la toma
  - Botón editar hora inicio/fin

- [ ] **Detalle de siesta** — al tocar una burbuja de sueño
  - `app/logs/sleep/[id].tsx` existe como placeholder
  - Similar al detalle de toma

- [ ] **Detalle de evento** — al tocar burbujas de eventos genéricos
  - `app/logs/event/[id].tsx` existe como placeholder

- [ ] **Crecimiento** — `app/logs/growth/new.tsx` y `history.tsx` existen como placeholders
  - Registro de peso/estatura/circunferencia cefálica
  - Curva de crecimiento (gráfica simple)

### 🟡 IMPORTANTE / Funcionalidad prometida

- [ ] **Catálogos custom** — `app/settings/catalogs.tsx` existe como placeholder
  - Agregar/editar/borrar tipos de evento (los no-system)
  - Agregar/editar/borrar observaciones de pañal
  - `CatalogModals.tsx` ya tiene parte de la lógica

- [ ] **Tab bar de navegación principal**
  - Tab 1: 💬 Chat (dashboard actual)
  - Tab 2: 📊 Stats (ya existe, solo falta el tab)
  - Tab 3: ⚙️ Configuración

- [ ] **Pantalla de configuración**
  - Catálogos custom
  - Gestión de cuidadores/perfiles
  - Ajustes generales

- [ ] **Nombre real del cuidador en burbujas**
  - Actualmente muestra "Otro cuidador"
  - Consultar `profiles` por `profileId` para mostrar nombre + rol

- [ ] **Estadísticas: gráficas de tendencia**
  - Actualmente son barras de progreso y números
  - Agregar chart de líneas para ver tendencia diaria/semanal (usando `react-native-svg` ya instalado)
  - Horas de sueño por noche, número de tomas por día, etc.

### 🟢 NICE TO HAVE / Mejoras futuras

- [ ] **Múltiples bebés** — el schema lo soporta, falta la UI de selección
- [ ] **Múltiples cuidadores** — el schema lo soporta, falta sincronización/compartir
- [ ] **Notificaciones** — recordar cada X horas si no hay toma registrada
- [ ] **Export de datos** — CSV o PDF del historial
- [ ] **Compartir imágenes múltiples en un solo share** — requiere `react-native-share` para `ACTION_SEND_MULTIPLE` en Android
- [ ] **Estadísticas: curvas de crecimiento** — percentiles OMS
- [ ] **Tema oscuro**
- [ ] **Onboarding de segundo cuidador** — QR para agregar al grupo
- [ ] **Reemplazar `[TU EMAIL AQUÍ]`** en archivos legales antes de publicar

---

## 📁 ESTRUCTURA DE ARCHIVOS ACTUAL

```
cielo-app/
├── app/
│   ├── _layout.tsx              ✅ runMigrations() lazy
│   ├── index.tsx                ✅ <Redirect> según onboarding_done
│   ├── baby/
│   │   └── profile.tsx          ✅ Perfil completo + avatar picker + fix input
│   ├── dashboard/
│   │   └── index.tsx            ✅ Timeline/chat principal + botón stats
│   ├── logs/
│   │   ├── diaper/new.tsx       ✅ Pañal + foto ← NUEVO
│   │   ├── event/new.tsx        ✅ Evento genérico
│   │   ├── event/[id].tsx       ⏳ Placeholder — detalle de evento
│   │   ├── feeding/new.tsx      ✅ (inline desde dashboard)
│   │   ├── feeding/retro.tsx    ⏳ Placeholder — toma rezagada
│   │   ├── feeding/[id].tsx     ⏳ Placeholder — detalle de toma
│   │   ├── growth/new.tsx       ⏳ Placeholder
│   │   ├── growth/history.tsx   ⏳ Placeholder
│   │   └── sleep/[id].tsx       ⏳ Placeholder — detalle de siesta
│   ├── onboarding/
│   │   ├── welcome.tsx          ✅
│   │   ├── role.tsx             ✅
│   │   └── baby.tsx             ✅ + avatar picker + fix DateTimePicker
│   ├── report/generate.tsx      ⏳ Placeholder (reemplazado por app/stats)
│   ├── settings/catalogs.tsx    ⏳ Placeholder
│   ├── stats/index.tsx          ✅ Stats completas ← NUEVO
│   └── timeline/index.tsx       ⏳ Placeholder (dashboard lo cubre)
│
├── src/
│   ├── components/ui/
│   │   ├── ActiveFeedingCard.tsx  ✅
│   │   ├── ActiveSleepCard.tsx    ✅ NUEVO
│   │   ├── AvatarPicker.tsx       ✅ NUEVO
│   │   ├── BigButton.tsx          ✅
│   │   ├── BottleSubtypeModal.tsx ✅
│   │   ├── CatalogModals.tsx      ✅ (parcial)
│   │   ├── DateTimePicker.tsx     ✅ NUEVO — fix raw string state
│   │   ├── PoopOMeter.tsx         ✅
│   │   └── TimelineBubbles.tsx    ✅ + SleepSessionBubble
│   ├── db/
│   │   ├── client.ts              ✅ getDb() lazy + resetAllData()
│   │   └── schema.ts              ✅ V4.2 con sleep_sessions
│   ├── hooks/
│   │   ├── useBaby.ts             ✅ + avatarEmoji/photoUri
│   │   ├── useFeedingSessions.ts  ✅
│   │   ├── useProfile.ts          ✅
│   │   ├── useSleepSessions.ts    ✅ NUEVO
│   │   ├── useStats.ts            ✅ NUEVO
│   │   └── useTimeline.ts         ✅
│   ├── services/
│   │   ├── imageStorage.ts        ✅
│   │   └── reportGenerator.ts     ✅ (reportes individuales de pañal/crecimiento)
│   └── utils/
│       ├── id.ts                  ✅
│       └── shareReport.ts         ✅ NUEVO — compartir reporte del período
```

---

## 🔢 ORDEN SUGERIDO PARA LO QUE FALTA

Teniendo en cuenta lo que ya tienes y lo que falta, esto es lo que tiene más impacto:

1. **Toma rezagada** — muy pedida en la vida real (siempre pasan cosas y te acordás después)
2. **Detalle de toma / siesta** — para poder ver exactamente qué pasó
3. **Tab bar** — la navegación actual por header se va llenando de botones
4. **Catálogos custom** — `CatalogModals.tsx` ya tiene base, solo falta la pantalla
5. **Crecimiento** — peso y talla son datos importantes para el pediatra
6. **Gráficas de tendencia** en stats — `react-native-svg` ya está instalado

---

## 🛠️ COMANDOS ÚTILES

```bash
# Desarrollo
npx expo start --android

# Reset manual por ADB (sin abrir la app)
adb shell run-as com.buscer.cieloapp rm /data/data/com.buscer.cieloapp/files/SQLite/cielo.db
adb shell pm clear com.buscer.cieloapp

# Build APK
eas build --profile preview --platform android

# Ver logs en tiempo real
adb logcat -s ReactNativeJS
```

---

## ⚙️ CONFIG

| Archivo | Nota |
|---------|------|
| `app.json` | scheme: "cieloapp", newArchEnabled: true, package: com.buscer.cieloapp |
| `eas.json` | npmFlags: --legacy-peer-deps, profile preview → APK |
| `tailwind.config.js` | Paleta rosa completa |
| `global.css` | @tailwind base/components/utilities |

> **Antes de publicar:** Reemplazar `[TU EMAIL AQUÍ]` en archivos legales (privacy policy, ToS).
