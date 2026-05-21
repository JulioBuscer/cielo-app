# 🍑 REDISEÑO PAÑAL — Observaciones multi-métrica + Pipímetro/Popómetro

> **Propósito:** Separar los conceptos de _cantidad_ y _salud_ (color) en pipí/popó, y darle a cada observación del pañal la capacidad de tener **múltiples métricas** configurables, cada una con sus propias zonas, colores y emojis.
>
> 🔗 **Plan maestro:** [`PLAN_V5.md`](./PLAN_V5.md)

---

## 📐 Modelo de datos

### `diaper_observations` — columna nueva

```sql
ALTER TABLE diaper_observations ADD COLUMN metrics TEXT NOT NULL DEFAULT '[]';
```

Tipo TypeScript:

```ts
type ObservationMetric = {
  id: string;
  name: string;              // "Intensidad", "Color", etc.
  scaleMin: number;
  scaleMax: number;
  zones: {
    min: number;
    max: number;
    label: string;
    color: string;            // hex
    emoji: string;
  }[];
};

type DiaperObservation = {
  id: string;
  emoji: string;
  label: string;
  isAlert: boolean;
  metrics: ObservationMetric[];   // [] → tag simple (sin slider)
  sortOrder: number;
  active: boolean;
};
```

- Las columnas viejas `scale_min`, `scale_max`, `zones` se **ignoran** (SQLite no deja dropear fácil).
- En migración: datos viejos pasan a `metrics: [{ id: "default", name: "default", scaleMin, scaleMax, zones }]`.

### `DiaperMetadata` (JSON en `timeline_events.metadata`)

```ts
type DiaperMetadata = {
  peeIntensity: number;                        // cantidad pipí (default 1-8)
  poopIntensity: number;                       // cantidad popó (default 0-5)

  peeHealth: number | null;                    // pipímetro (color) — nullable
  poopHealth: number | null;                   // popómetro (color) — nullable

  observationIds: string[];                    // tags simples (sin métricas)
  observationValues: Record<                   // obs con métricas
    string,                                    // observationId
    Record<string, number>                     // metricId → valor
  >;

  weightGrams: number | null;
  imageUri: string | null;
  duringFeedingType: string | null;
  duringFeedingMin: number | null;
  duringSleep: boolean | null;
};
```

- Para observaciones con **1 métrica default**: `{ "sangre": { "default": 7 } }`
- Para observaciones con **N métricas**: `{ "sangre": { "intensity": 7, "color": 3 } }`

### AsyncStorage — configs

```ts
// Intensidad pipí
'pee_intensity_config': {
  min: number,           // default 1
  max: number,           // default 8
  zones: { min, max, label, color }[]
}

// Intensidad popó
'poop_intensity_config': {
  min: number,           // default 0
  max: number,           // default 5
  zones: { min, max, label, color }[]
}

// Pipímetro (salud/color de la orina)
'pee_health_config': {
  enabled: boolean;
  min: number;
  max: number;
  zones: { min, max, label, color, emoji }[];
}

// Popómetro (salud/color de la popó)
'poop_health_config': {
  enabled: boolean;
  min: number;
  max: number;
  zones: { min, max, label, color, emoji }[];
}
```

---

## 🖼️ UI del formulario de pañal

```
┌─────────────────────────────────────┐
│            🍑 PAÑAL                 │
├─────────────────────────────────────┤
│                                     │
│  💧 PIPÍ                            │
│  Cantidad: [======●═══] 6/8         │
│  ─── Salud ───                      │
│  [══●════════] 3/8   🟡 Amarillo    │  ← pipímetro (si enabled)
│                                     │
│  💩 POPÓ                            │
│  Cantidad: [═══●════] 3/5           │
│  ─── Salud ───                      │
│  [════●════] 4/8    🟤 Marrón       │  ← popómetro (si enabled)
│                                     │
│  🔬 OBSERVACIONES                   │
│  [🩸 Sangre] [🔴 Mucosidad] [💚 Verde]
│                                     │
│  Al tap Sangre:                     │
│  ┌─────────────────────────────┐    │
│  │ 🩸 Sangre                   │    │
│  │ Intensidad [══●════] 7/10   │    │  ← slider por métrica
│  │ Color      [══●════] 3/5    │    │
│  │ 🟠 Naranja oscuro           │    │  ← zona resuelta
│  └─────────────────────────────┘    │
│                                     │
│  ⚖️ Peso: [  85  ] g  (opcional)   │
│  📸 [📷 Foto]                       │
│                                     │
│  [💾 Guardar]                       │
└─────────────────────────────────────┘
```

---

## ⚙️ Settings > Catálogos

Tres secciones en tabs:

### 1. Pipí
- Rango intensidad: `min`, `max`
- Zonas intensidad: color picker + label por zona
- **Pipímetro** (toggle on/off)
  - Si on: `min`, `max` + editor de zonas (min, max, label, color, emoji)

### 2. Popó
- Rango intensidad: `min`, `max`
- Zonas intensidad: color picker + label por zona
- **Popómetro** (toggle on/off)
  - Si on: `min`, `max` + editor de zonas (min, max, label, color, emoji)

### 3. Obs. Pañal (multi-métrica)
- Lista de observaciones con sus métricas
- Crear/editar observación:
  - emoji, label, isAlert
  - Agregar 1..N métricas
  - Cada métrica: name, min, max, y zonas (min, max, label, color, emoji)

---

## 🗂️ Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/db/schema.ts` | +col `metrics` en `diaperObservations`, actualizar `DiaperMetadata`, actualizar helpers |
| `src/db/client.ts` | ALTER TABLE, migrar datos viejos, seed con métricas multi-zona-emojis |
| `src/hooks/useTimeline.ts` | Actualizar `useCreateDiaperObservation`, `useUpdateDiaperObservation`. Helper `useGetObservationMetrics()`. |
| `app/settings/catalogs.tsx` | Agregar secciones Pipí y Popó con intensity + health config. Observaciones multi-métrica. |
| `app/logs/diaper/new.tsx` | Rediseño completo: pipímetro, popómetro, multi-métrica sliders, peso |
| `app/logs/event/[id].tsx` | Mostrar `peeHealth`/`poopHealth` con zona resuelta + multi-métrica |
| `src/utils/shareReport.ts` | Formatear nuevos campos en reporte |
| `src/hooks/useStats.ts` | Leer `peeHealth`/`poopHealth` en stats |

---

## 🔄 Migración de datos existentes

### Tabla `diaper_observations`
- Seed actual tiene observaciones con/sin escala
- Se migran a `metrics`:
  - Sin escala → `metrics: []`
  - Con escala → `metrics: [{ id: "default", name: "default", scaleMin, scaleMax, zones }]`

### `timeline_events.metadata` (registros de pañal existentes)
- `observationValues` guardado como `{ obsId: number }` → leer como `{ obsId: { default: number } }`
- Nuevos campos `peeHealth`, `poopHealth` → `null` en datos viejos

### AsyncStorage
- `pee_config` → renombrar a `pee_intensity_config`
- Nuevas claves: `poop_intensity_config`, `pee_health_config`, `poop_health_config`
