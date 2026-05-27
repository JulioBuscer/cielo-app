# Plan de Trabajo — Resumen Vivo

## ✅ Sprint 1 — Error Boundary + Safe Parse
- `src/utils/safeJsonParse.ts` — utility generic con fallback
- `src/components/ErrorBoundary.tsx` — class component con fallback UI rosa + Reintentar
- 9 `JSON.parse` inseguros corregidos en 7 archivos
- `<Stack>` envuelto en `<ErrorBoundary>` en `app/_layout.tsx`

## ✅ Sprint 2 — onError en Mutaciones
- 26 mutations de 8 hooks ahora tienen `onError: console.error`
- *Refinado en Sprint 5 con Alert al usuario*

## ✅ Sprint 3 — AsyncStorage Centralizado
- `src/utils/storage.ts` con 11 KEYS constantes + 9 getters tipados
- Eliminados todos los string literals de 8 hooks + 3 app files
- `clearSessionData()` reemplaza `multiRemove` en `client.ts`

## ✅ Sprint 4 — Migrar getDb() directo (6 app/ files)
- `app/logs/feeding/retro.tsx` → `useCreateRetroFeeding()`
- `app/catalog/food.tsx` → `useUpdateFoodCatalog()` + `useDeleteFoodCatalog()`
- `app/logs/food/new.tsx` → `useCreateFoodCatalogItem()` + `useSaveFoodLog()`
- `app/settings/catalogs.tsx` → `useDeleteEventType()`, `useUpdateEventTypeMetrics()`, `useDeleteDiaperObservation()`
- `app/(tabs)/analisis.tsx` → `useDayEvents()` + `useWeekSummary()` en `useCalendarData.ts`
- `app/history/index.tsx` → `useHistoryData()` en `useHistory.ts`

## ✅ Sprint 5 — Feedback de Error al Usuario
- `src/utils/mutationError.ts` — helper `onMutationError(tag)` que loggea + muestra `Alert.alert("Error", "Algo salió mal. Intenta de nuevo.")`
- 33 mutations en 8 hooks migrados

## ✅ Sprint 6 — Feeding/Sleep duplicados unificados
- `src/hooks/useSession.ts` — factory genérica `createSessionHooks<TRow, TStatusRow>()` con 9 hooks compartidos
- `useFeedingSessions.ts`: de 384 → ~93 líneas
- `useSleepSessions.ts`: de 284 → ~58 líneas
- Ahorro total: ~517 líneas eliminadas

## ✅ Sprint 7 — Flujo Pañal Rápido
- `src/components/ui/ScaleMeter.tsx` — `ScaleMeter`, `MetricSlider`, `ZoneNote` compartidos
- `src/utils/diaperDefaults.ts` — 5 configs de pañal + `getDiaperConfigs()` desde AsyncStorage
- `app/logs/diaper/new.tsx` y `[id].tsx` — refactorizados a componentes compartidos
- `src/components/diaper/DiaperSheet.tsx` — BottomSheet 3 niveles:
  - N1: Guardar Rápido 💧 (pipí=3, 1 tap)
  - N2: Ajustar popó (color + consistencia al seleccionar popó)
  - N3: Más detalles (obs, peso, foto, hora, notas)
- `app/(tabs)/index.tsx` — integrado (reemplaza `router.push`)
- CSIM: 16 pts → 1-3 pts

---

## 🔴 Sprint 8 — Sheets rápidos para Comida y Salud (PLANEADO)
**Objetivo:** Misma táctica BottomSheet inline en Health y Food logs.
**Patrón:** Copiar estructura de DiaperSheet — defaults inteligentes + detalles expandibles. Sin navegación a pantalla dedicada para el caso común.

| Registro | Default | CSIM actual | CSIM esperado |
|---|---|---|---|
| 🌡️ Salud | temp=36.5°C, sin síntomas | ~10 pts | 1-3 pts |
| 🍎 Comida | alimento preseleccionado | ~8 pts | 2-4 pts |

---

## Estado vs Auditorías

| Auditoría | SUS | Completado vs hallazgos |
|---|---|---|
| v1 (commit 5e857b7) | 52/100 | ✅ 5/5 hallazgos |
| v2 (post-refactor) | 58/100 | ✅ 9/11 (críticos y altos resueltos) |

### v2 — Resuelto ✅ (9/11)
- C1 ErrorBoundary → ✅ Sprint 1
- C2 92.6% mutations sin onError → ✅ Sprint 2+5
- C3 9 JSON.parse inseguros → ✅ Sprint 1
- A1 6 app/ files con getDb() → ✅ Sprint 4
- A2 Feeding/Sleep duplicados → ✅ Sprint 6
- A3 AsyncStorage keys dispersas → ✅ Sprint 3
- M1 catálogos.tsx 2,272→1,142 → ✅ Split parcial
- M3 shareReport.ts → ⏳ Pendiente
- M4 useUpdateGrowthLog invalidation → ⏳ Pendiente
- M2 Home density 28 elementos → 🔴 Sprint 7 (pañal resuelto, health/food siguientes)
- A4 27 catches silenciosos → ⚠️ No priorizado (bajo riesgo)

### SUS estimado actual: ~68/100

---

## Backlog priorizado

| # | Item | Impacto UX | Archivos | Dependencias |
|---|---|---|---|---|
| **1** | 🌡️ Sheet rápido Salud | 🔴 Alto (CSIM 10→1) | `SaludSheet.tsx`, `index.tsx` | Ninguna |
| **2** | 🍎 Sheet rápido Comida | 🟡 Medio (CSIM 8→2) | `FoodSheet.tsx`, `index.tsx` | Ninguna |
| **3** | 🏠 Home density (filtros a sheet colapsable) | 🟡 Medio (28→~18) | `index.tsx` | Puede ir en paralelo |
| **4** | 📂 catálogos.tsx → 5 screens | 🟡 Medio (mantenibilidad) | `settings/` | Ninguna |
| **5** | 📄 shareReport.ts — eliminar labels duplicados | 🟢 Bajo | `shareReport.ts` + hooks | Ninguna |
| **6** | 🐛 useUpdateGrowthLog invalidation | 🟢 Bajo | `useGrowthLogs.ts` | Ninguna |
