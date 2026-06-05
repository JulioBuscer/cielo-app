# Plan — Items, Plantillas y Tags

## Arquitectura Conceptual

```
CATEGORÍA (organización, sin parámetros)
│
└── ITEM (tiene métricas editables)
│   │  Ej: Medicamento → metrics: [{dosis, milliliter}]
│   │                   → defaultValues: {} (vacío)
│   │      Temperatura → metrics: [{temperatura, celsius}]
│   │
│   ├── PLANTILLA (hereda metrics del item, añade defaults)
│   │   Ej: Paracetamol 125mg
│   │     → parentId: "medicamento"
│   │     → defaultValues: { dosis: 5 }
│   │     → defaultNotes: "Cada 8 horas con alimento"
│   │     → defaultTags: ["fiebre", "dolor"]
│   │
│   └── PLANTILLA (Vitamina D3 400UI)
│       → parentId: "medicamento"
│       → defaultValues: { dosis: 0.5 }
│       → defaultTags: ["vitaminas"]
│
└── Tags (librería global reutilizable)
    Ej: ["fiebre", "dolor", "vitaminas", "alergia", "cólico"]
```

## Flujos de Usuario

### A. Registrar temperatura
```
Home → [🌡️ Temp.]
  → TemperatureSheet
    → seleccionar valor (preset o manual)
    → [opcional] síntomas + nota
    → [Guardar] → timeline_event + back
```

### B. Registrar medicamento sin plantilla
```
Home → [⚡ Más]
  → EventPickerModal 💊 SALUD → [💊 Medicamento]
    → /logs/event/new?preselect=medication
      → Form: Dosis [___] [mL]
        → [💾 Guardar] → timeline_event + back
        → [💾 Guardar como plantilla] → modal nombre/emoji → catalog_item
```

### C. Registrar con plantilla tap (1 tap directo)
```
Home → [⚡ Más]
  → EventPickerModal 💊 SALUD → [💊 Medicamento]
    → wizard step: muestra plantillas:
        [Paracetamol 5mL] (tap) → 🚀 quickSave → back
        [Vitamina D3]    (tap) → 🚀 quickSave → back
        [➕ Sin plantilla] → form vacío
```

### D. Registrar con plantilla long-press
```
Home → [⚡ Más]
  → EventPickerModal 💊 SALUD → [💊 Medicamento]
    → wizard step: muestra plantillas:
        [Paracetamol 5mL] (long-press)
          → form pre-rellenado: Dosis [5] [mL]
            → editar a 10
            → [💾 Guardar] → timeline_event con dose:10
```

### E. Home quick action (1 tap directo)
```
Home → [💊 Paracetamol] (isQuickAction)
  → tap → quickSave → back
  → long-press → form pre-rellenado
```

### F. Crear item custom con métricas
```
[⚡ Más] → [+ Nuevo Item]
  → Modal ItemEditor:
      Nombre: "Vitamina D3"
      Emoji: "💊"
      Categoría: [Salud ▼]
      Métricas:
        ┌──────────────────────────────┐
        │ Dosis    │ [mL        ▼] │ ✕ │
        │ Concent. │ [gotas      ▼] │ ✕ │
        │          │                 │ + │
        └──────────────────────────────┘
  → [Guardar] → catalog_item con metrics
```

## Plan de Implementación

### Fase 1: Fix UI bug — raw unitId en formulario
- **Archivo**: `app/logs/event/new.tsx` línea 495
- **Cambio**: Eliminar `{m.unitId ? <Text>({m.unitId})</Text> : null}` pues la unidad ya se muestra en botón de cycle

### Fase 2: Tap vs Long-press en plantillas
- **Archivo**: `app/logs/event/new.tsx`
- **Cambios**:
  - En wizard step 2/3, si item tiene `parentId` y `defaultValues` no vacío → tap = quickSave, long-press = form
  - Si item NO tiene `parentId` → comportamiento actual
  - Agregar "➕ Sin plantilla" para ir a form vacío

### Fase 3: Botón "Guardar como plantilla"
- **Archivos**: `app/logs/event/new.tsx`, nuevo `SaveAsPresetModal.tsx`
- **Cambios**: Botón en form step (solo si selectedItem es root) → modal nombre/emoji → `useCreateCatalogItem()` con parentId

### Fase 4: Crear/Editar items con métricas
- **Archivos**: `src/components/ui/CatalogModals.tsx`, hook `useUpdateCatalogItem`
- **Cambios**: Reemplazar `InlineEventTypeModal` con `ItemEditorModal` con editor de métricas dinámico

### Fase 5: Sistema de tags
- **Archivos**: `src/db/schema.ts`, `src/db/client.ts`, nuevo `src/hooks/useTags.ts`, `app/logs/event/new.tsx`
- **Cambios**: Nueva tabla `tags`, hook CRUD, autocomplete en form

### Fase 6: Home screen plantillas
- **Archivos**: `src/hooks/useCatalogItems.ts`
- **Cambios**: Verificar que `useQuickActionItems` incluya items con parentId; toggle "Mostrar en inicio" en editor de plantilla
