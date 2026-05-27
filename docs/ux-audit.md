# Auditoría UX — Cielo App (Unificada)

**v1:** commit 5e857b7 · SUS 52/100
**v2:** post-refactor (JSON nativo, transacciones, split catálogo) · SUS 58/100
**Actual:** post-sprints 3–7 (Storage centralizado, useSession, Pañal Rápido) · SUS ~68/100

---

## 1. Evolución de Hallazgos

### Resueltos ✅ (11/13)

| # | Hallazgo (v1/v2) | Gravedad | Sprint | Solución |
|---|---|---|---|---|
| C1 | Sin ErrorBoundary global | Crítica | 1 | `<ErrorBoundary>` en `_layout.tsx` |
| C2 | 92.6% mutations sin onError | Crítica | 2+5 | `onMutationError(tag)` con Alert |
| C3 | 9 JSON.parse inseguros | Crítica | 1 | `safeJsonParse<T>()` reemplaza todos |
| A1 | 6 app/ files con getDb() directo | Alta | 4 | hooks dedicados por archivo |
| A2 | Feeding/Sleep 85% duplicados (~600 líneas) | Alta | 6 | `createSessionHooks()` factory genérica |
| A3 | AsyncStorage keys dispersas en 9 archivos | Alta | 3 | `src/utils/storage.ts` con KEYS + getters |
| M1 | catálogos.tsx 2,272→1,142 líneas | Media | 4 | 8 componentes extraídos |
| — | Dual-write growth sin rollback | Alta | 2 | `useSaveMeasurement()` con transacción |
| — | Batch save Salud con Promise.all | Alta | 2 | Saves seriales + feedback granular |
| — | Presets como fila separada en Home | Media | 5 | QuickBtn en grilla, reemplazo dinámico |
| — | JSON en editor de plantillas | Crítica | 2 | Inputs nativos por métrica + selector unidad |

### Pendientes ⏳ (2)

| # | Hallazgo | Gravedad | Nota |
|---|---|---|---|
| M3 | shareReport.ts duplica labels | Baja | Pendiente |
| M4 | useUpdateGrowthLog invalidation incorrecta | Baja | Pendiente |

### No priorizados ⚠️

| # | Hallazgo | Gravedad | Razón |
|---|---|---|---|
| A4 | 27 catches silenciosos | Media | Bajo riesgo actual |
| — | Agrupar síntomas en categorías | Baja | UX menor |

---

## 2. CSIM — Esfuerzo de Interacción (Actualizado)

### 🍑 Registrar pañal (tarea principal)

| Versión | CSIM | Cambio |
|---|---|---|
| v1 (push screen + 5 escalas) | 12 pts | — |
| v2 (sin cambio) | 12 pts | 0 |
| **Actual (DiaperSheet inline)** | **1–3 pts** | **-75%** |

Flujo actual:
- Solo pipí (80%+ casos): 1 tap (Guardar Rápido)
- Pipí + popó: ~3 taps
- Full detalle: ~8 taps (todo inline, sin navegación)

### 🌡️ Registrar temperatura

| Paso | Pts |
|---|---|
| Tap Salud → sheet | 1 |
| Default 36.5° pre-seleccionado | 0 |
| Tap Guardar | 1 |
| **Total** | **2 pts** (potencial con sheet inline) |

### 💊 Crear plantilla

| Versión | CSIM | Cambio |
|---|---|---|
| v1 (JSON manual) | 29 pts | — |
| v2 (inputs nativos) | 14 pts | -52% |
| Actual | 14 pts | Sin cambio |

### 📏 Registrar medición (peso)

| Paso | Pts |
|---|---|
| Tap Medir → push screen | 1 + 3 |
| Ingresar peso | 1 |
| Tap Guardar | 1 |
| Esperar invalidación | 3 |
| **Total** | **9 pts** |

---

## 3. SUS Estimado

| Factor | v1 | v2 | Actual | Cambio |
|---|---|---|---|---|
| Complejidad del Home | 40 | 50 | 65 | +25 (DiaperSheet + menos ruido) |
| Editor plantillas (JSON→nativo) | 25 | 70 | 70 | Sin cambio |
| Catálogo abrumador | 35 | 45 | 50 | +5 (split parcial) |
| Consistencia patrones | 55 | 50 | 75 | +25 (useSession, storage central, sin getDb directo) |
| Flujo tareas frecuentes | 65 | 65 | 80 | +15 (pañal 1 tap) |
| Ayuda contextual | 45 | 45 | 45 | Sin cambio |
| Prevención errores | 30 | 40 | 70 | +30 (ErrorBoundary, onError, safeJsonParse, transacciones) |
| Percepción general | 50 | 55 | 65 | +10 |

**SUS ponderado actual: ~68/100** (vs 52 v1, 58 v2)

### Desglose por dimensión

| Dimensión | Score |
|---|---|
| Tareas básicas (pañal, toma, sueño, comida) | 80/100 |
| Configuración y personalización | 60/100 |
| Confianza y prevención de errores | 70/100 |
| Consistencia y predecibilidad | 75/100 |

---

## 4. Scorecard

| Métrica | v1 | v2 | Actual |
|---|---|---|---|
| CSIM — Pañal | 12 pts | 12 pts | **1–3 pts** |
| CSIM — Crear plantilla | 29 pts | 14 pts | 14 pts |
| CSIM — Temperatura | 4 pts | 4 pts | 2 pts (potencial) |
| CSIM — Medición peso | — | 9 pts | 9 pts |
| SUS estimado | 52/100 | 58/100 | **~68/100** |
| Problemas críticos | 3 | 3 | **0** |
| Archivos > 500 líneas | 5/33 | 6/27 | ~4/30 |

---

## 5. Próximos pasos para SUS > 80

| # | Acción | Impacto estimado |
|---|---|---|
| 1 | 🌡️ Sheet rápido Salud (mismo patrón DiaperSheet) | +5 SUS |
| 2 | 🍎 Sheet rápido Comida | +3 SUS |
| 3 | 🏠 Home density: filtros colapsables por defecto | +3 SUS |
| 4 | 📂 catálogos.tsx → 5 screens individuales | +2 SUS |
| 5 | 🐛 useUpdateGrowthLog invalidation + shareReport | +1 SUS |

*Documento unificado — reemplaza ux-audit.md (v1) y ux-audit-v2.md.*
