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
- `useFeedingSessions.ts`: de 384 → ~110 líneas (usa factory + feeding-specific extras: `useLastFeedingSession`, `useCreateRetroFeeding`, types/labels)
- `useSleepSessions.ts`: de 284 → ~70 líneas (usa factory + sleep-specific: `useSleepPreciseElapsed`)
- Ahorro total: ~488 líneas eliminadas

## 🟢 Backlog — Calidad de Vida
- `settings/catalogs.tsx` (1,136 líneas) — dividir en screens por tab
- `shareReport.ts` (583 líneas) — duplica labels de hooks
- `useUpdateGrowthLog` — invalida `'history'` pero `useSaveGrowthLog` no
