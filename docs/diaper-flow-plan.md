# Sprint 7 — Flujo Pañal Rápido

**Objetivo:** Reducir CSIM de 16 pts → 1-3 pts para el caso más común (solo pipí), sin perder información capturada actualmente.

**Táctica principal:** BottomSheet inline en Home, eliminando `router.push("/logs/diaper/new")`.

---

## CSIM actual (línea base)

| Paso | Pts |
|---|---|
| Tap 🍑 Pañal → push screen | 1 + 3 |
| Carga AsyncStorage (5 configs) + wait | 3 |
| Tap cantidad pipí (ScaleMeter 4 pasos) | 1 |
| Tap color pipí (ScaleMeter 8 pasos) | 1 |
| Tap cantidad popó (ScaleMeter 4 pasos) | 1 |
| Tap color popó (ScaleMeter 8 pasos) | 1 |
| Tap consistencia (ScaleMeter 5 pasos) | 1 |
| Observaciones (expandir chips + sliders) | 1 |
| Tap Guardar | 1 |
| `router.back()` + invalidación | 3 |
| **Total** | **16 pts** |

---

## Diseño: 3 Tiers

### Tier 1 — Default rápido (caso más común: solo pipí)

Sheet se abre con pee=3 pre-seleccionado (el valor "Normal" más frecuente) y poop=0. Un solo tap "Guardar Rápido" guarda todo.

```
┌──────────────────────────────────┐
│  🍑 Pañal              ✕ cerrar  │
│──────────────────────────────────│
│  💧 Pipí  [⚪⚪●⚪]  Normal        │ ← pee=3 default
│  💩 Popó  [●⚪⚪⚪]  Nada          │ ← poop=0 default
│──────────────────────────────────│
│  [💾 Guardar Rápido]             │ ← 1 tap
│  [📋 Más detalles ▾]             │ ← expande Tier 2+3
└──────────────────────────────────┘
```

CSIM: 1 pt (Guardar Rápido)

### Tier 2 — Popó presente (~3 taps)

Al tocar popó > 0, se expanden consistencia + color inline. Sheet se adapta dinámicamente.

```
│  💩 Popó  [⚪●⚪⚪]  Poquita      │
│    Consistencia [⚪●⚪⚪⚪] Pastosa │
│    Color        [⚪⚪●⚪⚪⚪...] Brn │
```

CSIM: abrir sheet (1) + tap poop (1) + tap guardar (1) = **3 pts**

### Tier 3 — Detalle completo (expandible)

Todo lo demás colapsado bajo "Más detalles":
- 🔬 Observaciones (chips + MetricSlider)
- ⚖️ Peso del pañal (TextInput gramos)
- 📸 Foto (cámara/galería)
- 🕐 Timestamp editable
- 📝 Notas
- 🚨 Alertas médicas inline (se muestran al seleccionar valor crítico, mismo comportamiento actual)

---

## Lo que NO se pierde

| Feature | Dónde va | Default |
|---|---|---|
| 💧 Cantidad pipí (1-4) | Tier 1, siempre visible | 3 (Normal) |
| 🔬 Color pipí (1-8 pipímetro) | Tier 3 (colapsado) | 0 |
| 💩 Cantidad popó (1-4) | Tier 1, siempre visible | 0 |
| 🎨 Color popó (1-8 popómetro) | Tier 2 (inline si poop>0) | 0 |
| 💩 Consistencia Bristol (1-5) | Tier 2 (inline si poop>0) | 0 |
| 🚨 Alertas médicas | Inline al seleccionar valor crítico | — |
| 🔬 Observaciones (chips + sliders) | Tier 3 | — |
| ⚖️ Peso del pañal | Tier 3 | — |
| 📸 Foto | Tier 3 | — |
| 🕐 Timestamp | Tier 3 | now |
| 📝 Notas | Tier 3 | — |
| ⏸️ Auto-pause feeding activo | En handleSave (sin cambios) | — |
| Guardado a timelineEvents | `useSaveTimelineEvent` (sin cambios) | — |

---

## Archivos a modificar/crear

### Nuevos
1. `src/components/ui/ScaleMeter.tsx` — extraído de `diaper/new.tsx` (hoy duplicado en new.tsx y [id].tsx)
2. `src/utils/diaperDefaults.ts` — defaults extraídos de ambos archivos (PEE_INTENSITY, POOP_INTENSITY, etc.)
3. `src/components/diaper/DiaperSheet.tsx` — BottomSheet con tiers 1-3

### Modificar
4. `app/(tabs)/index.tsx` — reemplazar `router.push("/logs/diaper/new")` por `setShowDiaperSheet(true)` + renderizar `<DiaperSheet>`
5. `app/logs/diaper/[id].tsx` — actualizar import de ScaleMeter desde el componente compartido
6. `app/logs/diaper/new.tsx` — actualizar import de ScaleMeter + defaults desde utils

### Consideración
- `app/logs/diaper/new.tsx` se **mantiene** como fallback (el sheet cubre el 90% de casos, pero el screen completo sigue siendo accesible para quien prefiera la vista detallada sin scroll en sheet)

---

## Dependencias

- Ninguna externa. Usar `<Modal>` nativo de RN (mismo patrón que `QuickPresetSheet`, `BottleSubtypeModal`)
- `getDiaperConfigs()` desde `src/utils/storage.ts` (ya existe el patrón de KEYS)

---

## CSIM final por escenario

| Escenario | CSIM | vs actual |
|---|---|---|
| Solo pipí (**más común**) | **1 pt** | 16 → 1 |
| Pipí + popó rápido | **3 pts** | 16 → 3 |
| Full detalle (obs, foto, peso, etc.) | **~8 pts** | 16 → 8 |
| Editar pañal existente (`[id].tsx`) | Sin cambio | — |
