# PLAN V4 — CIELO APP: REDISEÑO COMPLETO DE TOMAS Y TIMELINE

## CONTEXTO
El modelo original de "feeding_logs" era demasiado simple. La nueva visión nace de una necesidad real:
el usuario (papá + mamá) se enviaban mensajes en un grupo de WhatsApp para registrar tomas y eventos.
La app debe replicar esa dinámica: una **timeline tipo chat**, con registros en tiempo real y editables.

---

## 1. MODELO MENTAL — LA TIMELINE

La UI principal es una **timeline tipo chat**:
- Los eventos más recientes aparecen **abajo**
- Se hace scroll hacia arriba para ver el historial
- Muestra TODO: tomas, pañales, mediciones, medicamentos, etc.
- Una toma activa aparece destacada en la parte inferior como "tarjeta viva"

---

## 2. TOMAS DE LECHE (FeedingSession)

### 2.1 Tipos de toma
| Tipo         | Subtipo                                      |
|-------------|----------------------------------------------|
| breast_left  | (ninguno)                                    |
| breast_right | (ninguno)                                    |
| bottle       | breast_milk / formula / mixed / other        |

> ❌ Se elimina el tipo "mixed" de la selección principal (era breast_left+right)
> ✅ "mixed" solo existe como subtipo de biberón

### 2.2 Acceso rápido en Dashboard
3 botones grandes:
- 🤱 Pecho Izq.
- 🤱 Pecho Der.
- 🍼 Biberón (abre modal para elegir subtipo antes de iniciar)

Al presionar → crea `FeedingSession` con status `active` y `started_at = ahora`

### 2.3 Estados de una toma (FeedingSessionStatus)
```
start → pause → resume → pause → resume → finish
                                         ↑
                        (o automático si inicia otra toma)
```

Cada cambio de estado genera un `FeedingStatusEvent`:
- `start`   → timestamp
- `pause`   → timestamp  
- `resume`  → timestamp
- `finish`  → timestamp (puede ser automático)

**Cálculo de tiempo total:**
```
Σ (timestamp_pause_or_finish - timestamp_start_or_resume)
```
para cada par start/resume → pause/finish

### 2.4 Concurrencia de tomas
- **Una sola toma activa por bebé** — no importa cuántos usuarios haya
- Un usuario PUEDE tener múltiples tomas activas si tiene múltiples bebés registrados
- Cualquier usuario (profile) puede hacer pause/resume/finish en la toma activa del bebé
- Cada evento de status registra `profile_id` de quién lo hizo (para auditoría y reportes)

### 2.5 Auto-finish al iniciar nueva toma
Si existe una toma con status `active` o `paused` para ese bebé y se intenta iniciar otra:
→ La toma anterior recibe automáticamente un evento `finish` con timestamp = ahora
→ Se calcula y guarda su `duration_sec`
→ Luego se crea la nueva toma

### 2.5 Registro de toma retroactiva (completar rezagada)
Pantalla especial: "Registrar toma pasada"
- Elegir tipo + subtipo
- Hora de inicio (picker)
- Hora de fin (picker)
- Agregar eventos que ocurrieron (picker de hora para cada uno)
- Notas

---

## 3. EVENTOS DE TIMELINE (TimelineEvent)

Todo lo que sucede queda como un `TimelineEvent` con:
- `baby_id`, `profile_id`
- `feeding_session_id` (nullable — si ocurrió durante una toma activa)
- `event_type_id` → referencia a catálogo
- `timestamp` (editable por el usuario)
- `notes`
- `metadata` (JSON — datos extra según tipo de evento)

### 3.1 Tipos de evento por defecto (no eliminables)
| id               | emoji | label              | categoria   |
|-----------------|-------|--------------------|-------------|
| diaper           | 🍑    | Pañal              | diaper      |
| burp             | 💨    | Eructo             | feeding     |
| regurgitation    | 🤧    | Regurgitación      | health      |
| vomit            | 🤮    | Vómito             | health      |
| medication       | 💊    | Medicamento        | health      |
| weight           | ⚖️    | Peso               | growth      |
| height           | 📏    | Estatura           | growth      |
| temperature      | 🌡️    | Temperatura        | health      |
| note             | 📝    | Nota               | other       |

### 3.2 Eventos personalizados
El usuario puede agregar más eventos con:
- Emoji (selector)
- Nombre/descripción
- Categoría

Panel de gestión en Configuración.

### 3.3 Regla especial: Pañal durante toma activa
Si se registra un pañal mientras hay una toma `active`:
→ Se agrega automáticamente un evento `pause` a la toma
→ El pañal queda vinculado a la sesión

### 3.4 Metadata por tipo de evento

**Pañal:**
```json
{
  "pee_intensity": 0-5,
  "poop_intensity": 0-5,
  "observations": ["blood", "mucus", "diarrhea", "custom_id_1"]
}
```

**Observaciones del pañal** — catálogo (como event_types):
- Por defecto: 🩸 Sangre, 🤧 Mucosidad, ⚠️ Diarrea, 🟢 Verde, ☁️ Grumoso
- El usuario puede agregar más

**Medicamento:**
```json
{ "medicine_name": "Paracetamol", "dose": "0.5ml" }
```

**Peso/Estatura:**
```json
{ "weight_grams": 3500, "height_mm": 500, "head_circ_mm": 340 }
```

---

## 4. NUEVO SCHEMA DE BASE DE DATOS

### Tablas a ELIMINAR
- `feeding_logs` → reemplazada por `feeding_sessions` + `feeding_status_events`
- `growth_logs` → migrada a `timeline_events` con metadata JSON
- `diaper_logs` → migrada a `timeline_events` con metadata JSON

### Tablas NUEVAS

```sql
-- Catálogo de tipos de evento (default + custom)
CREATE TABLE event_types (
  id          TEXT PRIMARY KEY,
  emoji       TEXT NOT NULL,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL,  -- 'diaper'|'feeding'|'health'|'growth'|'other'
  is_system   INTEGER DEFAULT 0,  -- 1 = no se puede borrar
  created_at  INTEGER NOT NULL
);

-- Catálogo de observaciones de pañal (default + custom)
CREATE TABLE diaper_observations (
  id          TEXT PRIMARY KEY,
  emoji       TEXT NOT NULL,
  label       TEXT NOT NULL,
  is_system   INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL
);

-- Sesiones de toma
CREATE TABLE feeding_sessions (
  id              TEXT PRIMARY KEY,
  baby_id         TEXT NOT NULL REFERENCES babies(id),
  profile_id      TEXT NOT NULL REFERENCES profiles(id),
  type            TEXT NOT NULL,  -- 'breast_left'|'breast_right'|'bottle'
  bottle_subtype  TEXT,           -- 'breast_milk'|'formula'|'mixed'|'other' (solo si type='bottle')
  status          TEXT NOT NULL DEFAULT 'active',  -- 'active'|'paused'|'finished'
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,        -- NULL si no ha terminado
  duration_sec    INTEGER,        -- Calculado al terminar
  notes           TEXT,
  created_at      INTEGER NOT NULL
);

-- Eventos de estado de toma (start/pause/resume/finish)
CREATE TABLE feeding_status_events (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES feeding_sessions(id),
  type            TEXT NOT NULL,  -- 'start'|'pause'|'resume'|'finish'
  timestamp       INTEGER NOT NULL
);

-- Todos los eventos de la timeline
CREATE TABLE timeline_events (
  id                  TEXT PRIMARY KEY,
  baby_id             TEXT NOT NULL REFERENCES babies(id),
  profile_id          TEXT NOT NULL REFERENCES profiles(id),
  feeding_session_id  TEXT REFERENCES feeding_sessions(id),  -- NULL si no está en toma
  event_type_id       TEXT NOT NULL REFERENCES event_types(id),
  timestamp           INTEGER NOT NULL,
  notes               TEXT,
  metadata            TEXT,  -- JSON string con datos extra
  created_at          INTEGER NOT NULL
);
```

---

## 5. PANTALLAS NUEVAS / REDISEÑADAS

### 5.1 Dashboard (rediseño)
- **Tarjeta de toma activa** (si existe): tipo, tiempo transcurrido en vivo, botones Pausa/Continuar/Terminar
- **3 botones rápidos**: 🤱 Izq | 🤱 Der | 🍼 Biberón
- **Botón secundario**: "+ Evento" (pañal, eructo, medicamento, etc.)
- **Mini timeline**: últimos 5 eventos del día

### 5.2 Timeline (pantalla principal de historial)
- Lista invertida (FlatList inverted) — más reciente abajo
- Cada item muestra: emoji + label + hora + notas
- Las tomas muestran: tipo + duración total + status
- Al tocar una toma → abre detalle con sus eventos internos
- Botón "Ver todo" → infinite scroll del historial completo

### 5.3 Detalle de toma
- Header: tipo, subtipo, hora inicio → hora fin, duración total
- Timeline interna: eventos que ocurrieron durante la toma (incluyendo pausas)
- Botones de edición: cambiar tipo, editar hora inicio/fin
- Botón: agregar evento retroactivo

### 5.4 Registro de toma retroactiva
- Picker: tipo + subtipo
- DateTimePicker: hora inicio
- DateTimePicker: hora fin
- Lista de eventos durante la toma (con hora editable cada uno)
- Notas

### 5.5 Panel de configuración de eventos
- Lista de event_types con opción de agregar/editar/borrar (los no-system)
- Lista de diaper_observations con igual gestión
- Botón "Agregar tipo de evento": emoji picker + nombre + categoría

---

## 6. HOOKS NUEVOS NECESARIOS

```ts
// Sesiones de toma
useFeedingSession(sessionId)      // Detalle de una sesión
useActiveFeedingSession(babyId)   // La sesión activa o en pausa
useStartFeeding(type, subtype?)   // Inicia nueva sesión
usePauseFeeding(sessionId)        // Agrega evento 'pause'
useResumeFeeding(sessionId)       // Agrega evento 'resume'
useFinishFeeding(sessionId)       // Agrega evento 'finish', calcula duración
useFeedingHistory(babyId)         // Historial de sesiones

// Timeline
useTimeline(babyId, limit?)       // Eventos paginados, más reciente primero
useSaveTimelineEvent(...)         // Crear evento
useUpdateTimelineEvent(id, ...)   // Editar evento (timestamp, notas, metadata)

// Catálogos
useEventTypes()                   // Lista de tipos de evento
useCreateEventType(...)           // Agregar tipo custom
useDiaperObservations()           // Lista de observaciones de pañal
useCreateDiaperObservation(...)   // Agregar observación custom
```

---

## 7. ORDEN DE IMPLEMENTACIÓN

### Fase 1 — Schema y migración (1 sesión)
1. Reescribir `schema.ts` con las nuevas tablas
2. Actualizar `client.ts` con las nuevas tablas + seed de datos default
3. Verificar que la app arranca sin errores

### Fase 2 — Tomas en vivo (1-2 sesiones)
1. Hooks: `useActiveFeedingSession`, `useStartFeeding`, `usePauseFeeding`, `useResumeFeeding`, `useFinishFeeding`
2. Tarjeta de toma activa en Dashboard con timer en vivo
3. Los 3 botones de inicio rápido

### Fase 3 — Timeline (1 sesión)
1. Hook `useTimeline`
2. Pantalla Timeline con FlatList invertida
3. Items de toma, pañal, eventos genéricos

### Fase 4 — Eventos y pañal (1 sesión)
1. Hook `useSaveTimelineEvent`
2. Modal de nuevo evento (selector de tipo)
3. Form de pañal con observaciones
4. Vinculación automática a toma activa + auto-pausa

### Fase 5 — Detalle y edición (1 sesión)
1. Pantalla detalle de toma con timeline interna
2. Edición de timestamps
3. Registro retroactivo de toma completa

### Fase 6 — Configuración de catálogos (1 sesión)
1. Panel de event_types custom
2. Panel de diaper_observations custom

---

## 8. DATOS DEFAULT (seed en runMigrations)

```ts
const DEFAULT_EVENT_TYPES = [
  { id: 'diaper',        emoji: '🍑', label: 'Pañal',          category: 'diaper',   is_system: 1 },
  { id: 'burp',          emoji: '💨', label: 'Eructo',          category: 'feeding',  is_system: 1 },
  { id: 'regurgitation', emoji: '🤧', label: 'Regurgitación',   category: 'health',   is_system: 1 },
  { id: 'vomit',         emoji: '🤮', label: 'Vómito',          category: 'health',   is_system: 1 },
  { id: 'medication',    emoji: '💊', label: 'Medicamento',     category: 'health',   is_system: 1 },
  { id: 'weight',        emoji: '⚖️', label: 'Peso',            category: 'growth',   is_system: 1 },
  { id: 'height',        emoji: '📏', label: 'Estatura',        category: 'growth',   is_system: 1 },
  { id: 'temperature',   emoji: '🌡️', label: 'Temperatura',    category: 'health',   is_system: 1 },
  { id: 'note',          emoji: '📝', label: 'Nota',            category: 'other',    is_system: 1 },
];

const DEFAULT_DIAPER_OBSERVATIONS = [
  { id: 'blood',    emoji: '🩸', label: 'Sangre',      is_system: 1 },
  { id: 'mucus',    emoji: '🤧', label: 'Mucosidad',   is_system: 1 },
  { id: 'diarrhea', emoji: '⚠️', label: 'Diarrea',    is_system: 1 },
  { id: 'green',    emoji: '🟢', label: 'Verde',       is_system: 1 },
  { id: 'lumpy',    emoji: '☁️', label: 'Grumoso',    is_system: 1 },
];
```

---

## 9. LECCIONES APRENDIDAS (mantener del V3)

| Problema | Solución |
|---------|----------|
| `create-expo-app` instala SDK más nuevo de lo que Expo Go soporta | Verificar versión de Expo Go antes de crear proyecto |
| `react-native-css-interop` en NativeWind 4.2+ asume Reanimated v4 | NativeWind 4.2+ + Reanimated 4.x van juntos |
| Reanimated v4 requiere New Architecture | `newArchEnabled: true` en app.json |
| `crypto.randomUUID()` no existe en Hermes | Usar `generateId()` de `src/utils/id.ts` |
| `expo-file-system` API legacy deprecada | Importar desde `expo-file-system/legacy` |
| `router.replace` en useEffect antes del mount | Mover la redirección al `app/index.tsx` con `<Redirect>` |
| EAS Build sin `--legacy-peer-deps` | Agregar `"npm": { "npmFlags": "--legacy-peer-deps" }` en eas.json |

---

## 11. IMPLEMENTACIÓN UI V1 — ESTILO WHATSAPP (Completada)

### Paleta de colores
| Token         | Valor     | Uso                              |
|--------------|-----------|----------------------------------|
| bg            | #FFF0F5   | Fondo general (rosa muy suave)   |
| bgCard        | #FFFFFF   | Cards y burbujas "in"            |
| bgElevated    | #FFE4EE   | Inputs y chips                   |
| cielo         | #FF5C9A   | Acento principal                 |
| header        | #FF8AB3   | Header y StatusBar               |
| bubbleOut     | #FFB7D5   | Burbujas propias                 |
| bubbleIn      | #FFFFFF   | Burbujas del otro cuidador       |
| bottle        | #A855F7   | Botón biberón                    |
| diaper        | #F59E0B   | Botón pañal                      |
| tomaActive    | #FFF3E0   | Fondo tarjeta toma activa        |
| whatsGreen    | #25D366   | Botón enviar (WhatsApp)          |
| textPrimary   | #2D1B26   | Texto principal                  |
| textMuted     | #9B7A88   | Texto secundario/labels          |

### Arquitectura de pantallas
- `app/dashboard/index.tsx` → **Timeline/Chat** (pantalla principal)
- `app/logs/diaper/new.tsx` → Registro pañal (estilo rosa)
- `app/logs/event/new.tsx` → Evento genérico (recibe `preselect` param)
- `app/onboarding/*.tsx` → Todo el onboarding con header rosa

### Componentes nuevos
| Archivo | Descripción |
|---------|-------------|
| `TimelineBubbles.tsx` | `TimelineBubble`, `FeedingSessionBubble`, `DateSeparator`, `SystemBubble` |
| `ActiveFeedingCard.tsx` | Tarjeta fija de toma activa con timer en vivo |
| `BottleSubtypeModal.tsx` | Sheet de selección de subtipo de biberón |

### Lógica de burbujas
- Derecha (rosa `#FFB7D5`): registros del usuario activo (`profileId === profile.id`)
- Izquierda (blanco `#FFFFFF`): registros del otro cuidador
- Tomas terminadas: burbuja especial con borde izquierdo rosa + pill de duración
- Separadores de fecha: centrados, fondo rosa semi-transparente

### Barra de acciones
- 5 botones circulares: 🤱 Izq · 🤱 Der · ＋ Evento · 🍼 Biberón · 🍑 Pañal
- ＋ central (62px, rosa intenso) abre EventPickerModal inline
- Input de notas rápidas + botón verde WhatsApp
- Biberón abre BottleSubtypeModal antes de iniciar sesión

---

## 10. NOTAS DE DISEÑO UX

- La **hora es crítica** — siempre mostrar hora exacta en cada evento
- El flujo principal es **velocidad**: papá/mamá con el bebé en brazos debe poder registrar en 2 taps
- Los eventos durante toma son secundarios — no interrumpen el flujo principal
- La timeline es el "chat" — el historial completo del día/semana/mes del bebé
- Editar timestamps es esencial — siempre pasan cosas y se registran después
- Los catálogos custom son importantes — cada familia tiene su vocabulario propio
