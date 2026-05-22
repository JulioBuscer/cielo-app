# 🌙 CIELO APP — PLAN FASE 3: Eventos con Métricas y Unidades

> **Estado:** Pendiente · **Prioridad:** Alta
> *Objetivo: Convertir el sistema de eventos en una plataforma de datos
>  medibles, comparable en estadísticas y extensible por el usuario.*

---

## 🎯 VISIÓN

Hoy los eventos (`timelineEvents`) guardan metadatos como texto JSON plano:
`{ weightGrams: 3500, medicineName: "Paracetamol", celsius: 37.5 }`. Es
imposible hacer cálculos, comparaciones o estadísticas sobre esos datos.

**Solución**: Extender `eventTypes` con un sistema de métricas (como ya
tienen las observaciones de pañal) y un sistema de unidades de medida.
Cada evento puede capturar valores numéricos con unidades → estadísticas
reales, filtros, comparaciones.

---

## 📦 1. SISTEMA DE UNIDADES

### 1.1 Dimensiones y unidades soportadas

| Dimensión | Unidad ID | Símbolo | Base | toBase |
|-----------|-----------|---------|------|--------|
| `mass` | `gram` | g | gramo | ×1 |
| `mass` | `kilogram` | kg | gramo | ×1000 |
| `mass` | `pound` | lb | gramo | ×453.592 |
| `mass` | `ounce` | oz | gramo | ×28.3495 |
| `volume` | `milliliter` | mL | mL | ×1 |
| `volume` | `liter` | L | mL | ×1000 |
| `volume` | `fluid_ounce` | fl oz | mL | ×29.5735 |
| `temperature` | `celsius` | °C | °C | ×1 |
| `temperature` | `fahrenheit` | °F | °C | (°F − 32) / 1.8 |
| `length` | `millimeter` | mm | mm | ×1 |
| `length` | `centimeter` | cm | mm | ×10 |
| `length` | `meter` | m | mm | ×1000 |
| `length` | `inch` | in | mm | ×25.4 |
| `dimensionless` | `count` | — | — | ×1 |

### 1.2 Interfaz `Unit`

```typescript
export type UnitDimension = 'mass' | 'volume' | 'temperature' | 'length' | 'dimensionless';

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  toBase: (val: number) => number;
  fromBase: (val: number) => number;
}
```

Las unidades se definen en un registry (`src/units/registry.ts`) y
no se persisten en DB (son fijas). Si en el futuro se requieren unidades
custom, se agregan al registry.

### 1.3 Conversión para estadísticas

Para comparar valores en stats, se normaliza a la unidad base de la
dimensión (gramos, mL, °C, mm). Ej: 1 kg + 500 g = 1500 g.

---

## 🏗️ 2. CAMBIOS EN SCHEMA

### 2.1 `eventTypes` — nueva columna `metrics`

```typescript
export const eventTypes = sqliteTable('event_types', {
  // ... columnas existentes ...
  metrics: text('metrics').default('[]'), // JSON: EventMetric[]
});
```

Interfaz de métrica:

```typescript
export interface EventMetric {
  id: string;
  name: string;         // "Peso", "Dosis", "Temperatura"
  unitId: string;       // ref al Unit registry: "kilogram", "celsius", "milliliter"
  scaleMin?: number;    // para slider con rango acotado
  scaleMax?: number;
  zones?: ObservationZone[];  // zonas de color (opcional)
}
```

Reusa las interfaces `ObservationZone` existentes.

### 2.2 `timelineEvents` — nueva columna `values`

Agregar columna `values` (JSON) para almacenar los valores métricos
de forma estructurada:

```typescript
values: text('values').default('{}'), // JSON: Record<string, number>
```

Donde `values = { "weight": 3.5, "height": 50 }` mapea `metricId → value`.

La columna `metadata` existente se mantiene para compatibilidad pero
se depreca para nuevos eventos.

---

## 🗄️ 3. MIGRACIÓN DE DATOS

### 3.1 Seed de métricas para tipos de sistema

| eventTypeId | metricId | name | unitId | scaleMin | scaleMax |
|-------------|----------|------|--------|----------|----------|
| `weight` | `weight` | Peso | `kilogram` | 0 | 30 |
| `height` | `height` | Estatura | `centimeter` | 0 | 120 |
| `head_circ` | `head_circ` | C. Cefálica | `centimeter` | 0 | 60 |
| `temperature` | `temperature` | Temperatura | `celsius` | 34 | 42 |
| `medication` | `dose` | Dosis | `milliliter` | 0 | 100 |

### 3.2 Migración de datos existentes

Los eventos viejos tienen metadata en formato legacy:
```json
{ "weightGrams": 3500, "heightMm": 500, "headCircMm": 340, "celsius": 37.5 }
```

La migración (en `src/db/client.ts`) mapea:
| Legacy field | eventTypeId | metricId | toUnit | Fórmula |
|-------------|-------------|----------|--------|---------|
| `weightGrams` | `weight` | `weight` | kg | valor / 1000 |
| `heightMm` | `height` | `height` | cm | valor / 10 |
| `headCircMm` | `head_circ` | `head_circ` | cm | valor / 10 |
| `celsius` | `temperature` | `temperature` | °C | valor |

Se ejecuta como parte de `runMigrations()`.

---

## 🖥️ 4. CAMBIOS EN UI

### 4.1 Catálogos → Editor de métricas por tipo de evento

En `app/settings/catalogs.tsx`, pestaña "📝 Eventos":

- Cada tipo de evento muestra un badge "⚙️ N métricas" si tiene métricas
- Botón "➕ Añadir métrica" → abre formulario inline:
  - Nombre de la métrica
  - Unidad (dropdown de units disponibles)
  - Escala mín/max (opcional)
  - Zonas de color (opcional, mismo `ZoneEditor` que pañal)
- Botón "✏️ Editar" en cada métrica
- Botón "🗑️ Eliminar" con confirmación

Se puede reusar el componente `ObservationForm` actual adaptándolo.

### 4.2 Creación de evento — Captura de valores

En `app/logs/event/new.tsx`, paso 2:

- Si el `eventType` seleccionado tiene métricas → mostrar inputs:
  - **Con zonas**: `MetricSlider` (reusar de pañal) con colores de fondo
  - **Sin zonas**: `TextInput` numérico + etiqueta de unidad (ej: "kg")
- Los valores se guardan en `timelineEvent.values` como `Record<string, number>`

Para los eventos sin métricas: igual que hoy (solo notas + timestamp).

### 4.3 Detalle de evento — Display de valores

En `app/logs/event/[id].tsx`:

- Mostrar cada métrica como fila con:
  - Nombre de métrica
  - Valor + unidad (ej: "3.5 kg")
  - Si tiene zonas: color de fondo, label de zona, emoji
- Reusar la lógica de `getMetricZoneColor` / `getMetricZoneLabel`

Compatibilidad hacia atrás: si el evento viejo solo tiene `metadata`
(legacy), mostrarlo con el formato actual.

---

## 📊 5. ESTADÍSTICAS

### 5.1 Nuevo hook `useEventMetrics`

```typescript
function useEventMetrics(babyId: string, period: DateRange) {
  // Query timelineEvents for types that have metrics
  // Normalize values to base units
  // Return aggregates: avg, min, max, count per metric
}
```

### 5.2 UI en `app/stats/index.tsx`

Nueva sección "📏 Mediciones" (o similar) que muestra para cada tipo de
evento con métricas:

- Promedio del período
- Mín/Máx
- Gráfica de línea (valores a lo largo del período)
- Comparación vs período anterior (+15%, etc.)

Ejemplo para `weight`:
```
⚖️ Peso
  Promedio: 8.5 kg  (+200g vs semana pasada)
  Mín: 8.2 kg · Máx: 8.8 kg
  [gráfica de línea con últimos 7 puntos]
```

### 5.3 Compatibilidad con datos legacy

Los eventos con `metadata` legacy también se incluyen en stats,
normalizando sus valores a las unidades base.

---

## 🧩 6. ARCHIVOS A MODIFICAR/CREAR

### Nuevos archivos

| Archivo | Propósito |
|---------|-----------|
| `src/units/registry.ts` | Definición de todas las unidades, registro y helpers de conversión |
| `src/units/types.ts` | Interfaces `Unit`, `UnitDimension` |
| `src/units/index.ts` | Barrel export |
| `src/units/UnitBadge.tsx` | Componente UI: etiqueta de unidad (ej: "kg") para inputs |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/db/schema.ts` | Agregar columna `metrics` a `eventTypes`, columna `values` a `timelineEvents` |
| `src/db/client.ts` | Migración: seed métricas + migrar datos legacy |
| `app/settings/catalogs.tsx` | Editor de métricas en pestaña Eventos |
| `app/logs/event/new.tsx` | Inputs de métricas en paso 2 |
| `app/logs/event/[id].tsx` | Display de valores con unidades |
| `app/stats/index.tsx` | Sección de mediciones |
| `src/hooks/useTimeline.ts` | Hook `useEventMetrics`, actualizar queries |
| `src/hooks/useStats.ts` | Agregar métricas a los stats |

---

## 📋 7. PLAN DE EJECUCIÓN

### Paso 1 — Infraestructura
- Crear `src/units/` con registry de unidades
- Interfaces `EventMetric`
- Helper `normalizeToBase(value, unitId, targetUnitId)`
- Componente `UnitBadge`

### Paso 2 — Schema + migración
- Agregar columna `metrics` a `eventTypes`
- Agregar columna `values` a `timelineEvents`
- Seed de métricas para tipos de sistema
- Migrar datos legacy (weightGrams → values)

### Paso 3 — Editor de métricas en catálogos
- Adaptar `ObservationForm` para `eventTypes`
- Editor de zonas reutilizado
- Guardar `metrics` JSON

### Paso 4 — Captura de valores al crear evento
- Detectar si eventType tiene métricas
- Renderizar inputs (slider o numérico según configuración)
- Guardar en `values`

### Paso 5 — Display en detalle de evento
- Mostrar métricas con unidades
- Zonas de color
- Compatibilidad legacy

### Paso 6 — Estadísticas
- Hook `useEventMetrics`
- UI de mediciones en stats
- Gráfica de línea

### Paso 7 — Limpieza
- Deprecar `metadata` column (mantener para lectura legacy)
- Actualizar SITEMAP.md

---

## ⚠️ RIESGOS Y CONSIDERACIONES

- **Compatibilidad**: Los eventos existentes con `metadata` legacy deben
  seguir mostrándose correctamente. La migración es one-way (se escribe
  `values`, se deja `metadata` intacto).
- **Rendimiento**: El hook `useEventMetrics` debe hacer queries
  eficientes. Indexar por `eventTypeId` si es necesario.
- **UX**: Las métricas con zonas (sliders coloridos) son opcionales.
  Para métricas simples (ej: dosis de medicamento), usar TextInput
  numérico plano.
- **Unidades custom**: No en esta fase. Si un usuario necesita una
  unidad no soportada, se agrega al registry centralizado.

---

## 🔗 RELACIÓN CON PLAN_V5.md

Este plan reemplaza y expande la Fase 3 del plan maestro original
(que decía solo "Refinamientos UX"). Las curvas de crecimiento y
gráficas pasan a ser el **Paso 6** de este plan, integradas con el
nuevo sistema de métricas.
