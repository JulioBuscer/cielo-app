# Auditoría UX v2 — Cielo App (Post-Refactor)

**Fecha:** 27 de mayo de 2026
**Versión Post-Refactor:** Presets nativos, guardado transaccional, split catálogo, home minimal

---

## 1. Cambios vs v1

| Issue v1 | Estado | Resultado |
|---|---|---|
| JSON en editor de plantillas | ✅ **Corregido** | Inputs nativos por métrica + selector unidad cíclico |
| Dual-write growth sin rollback | ✅ **Corregido** | `useSaveMeasurement()` con transacción SQLite |
| Batch save Salud con Promise.all | ✅ **Corregido** | Saves seriales con try/catch individual + feedback granular |
| Catálogo 2,272 líneas | ✅ **Split parcial** | 1,142 líneas + 8 componentes extraídos |
| Rezagada/Recursos como chips | ✅ **Corregido** | Movidos a Perfil, menos ruido en home |
| Presets como fila separada | ✅ **Integrados** | QuickBtn en grilla, reemplazo dinámico de "➕ Evento" |

---

## 2. Evaluación Heurística de Complejidad (Nuevos Hallazgos)

### 2.1 Sin Error Boundary Global — 🔴 CRÍTICO (NUEVO)

**Problema:** `app/_layout.tsx` envuelve la app solo en `QueryClientProvider > ThemeProvider > Stack`. No hay `ErrorBoundary` en ningún nivel. Cualquier error de renderizado no capturado deja la pantalla en blanco o crashea la app.

**Impacto:** Si un hook lanza durante render (ej. `JSON.parse` falla en `analisis.tsx:295`), toda la pantalla se cae sin fallback.

**Evidencia:** 0 ocurrencias de `ErrorBoundary`, `componentDidCatch`, o `react-error-boundary` en el código.

### 2.2 92.6% de Mutaciones sin `onError` — 🔴 CRÍTICO (NUEVO)

**Problema:** 25 de 27 hooks `useMutation` carecen de callback `onError`. Si falla un INSERT/UPDATE en SQLite (ej. violación de constraint, FK error), el error se traga silenciosamente. El usuario no recibe feedback.

| Hook | Mutaciones | Con onError |
|---|---|---|
| `useEventPresets.ts` | 5 | 0 |
| `useTimeline.ts` | 5 | 0 |
| `useGrowthLogs.ts` | 3 | 0 |
| `useSleepSessions.ts` | 5 | 0 |
| `useFeedingSessions.ts` | 5 | 0 |
| `useFoodLogs.ts` | 1 | 0 |
| `useProfile.ts` | 1 | 0 |
| `useBaby.ts` | 2 | 0 |
| **Total hooks** | **27** | **0** |

Las únicas 2 excepciones están en `app/baby/profile.tsx` y `app/onboarding/role.tsx` (no hooks).

**Impacto:** El usuario hace tap en "Guardar", la UI muestra spinner, y luego... nada. El dato no se guardó pero nadie lo sabe.

### 2.3 JSON.parse Inseguro — 🟡 ALTO (NUEVO)

**Problema:** 9/54 llamadas a `JSON.parse` (16.7%) no están envueltas en try/catch y pueden lanzar excepción en runtime.

| Archivo | Línea | Riesgo |
|---|---|---|
| `app/settings/catalogs.tsx` | 588, 759 | Renderizado de lista — datos malformados rompen la pantalla |
| `src/components/catalogs/EventMetricsEditor.tsx` | 31 | Inicialización de estado |
| `src/components/catalogs/ObservationForm.tsx` | 29 | Inicialización de estado |
| `app/history/index.tsx` | 294 | Solo verifica tipo string, no captura parse error |
| `app/(tabs)/analisis.tsx` | 295-296 | Guardia `typeof` pero no catch |
| `src/theme/themeStorage.ts` | 21 | Carga de temas custom |
| `app/logs/diaper/[id].tsx` | 261 | Relleno previo en edición |

**Impacto:** Datos corruptos o legacy (ej. después de migración) pueden hacer pantallas enteras inaccesibles.

### 2.4 6 Screen Files Bypass Hooks — 🟡 ALTO (NUEVO)

**Problema:** 6 archivos en `app/` importan y llaman `getDb()` directamente en vez de usar hooks, creando un patrón inconsistente:

| Archivo | Llamadas getDb() |
|---|---|
| `app/settings/catalogs.tsx` | 3 |
| `app/catalog/food.tsx` | 2 |
| `app/logs/food/new.tsx` | 2 |
| `app/history/index.tsx` | 1 |
| `app/(tabs)/analisis.tsx` | 2 |
| `app/logs/feeding/retro.tsx` | 1 |

**Impacto:** Datos leídos sin cache de TanStack Query. Mutaciones hechas sin invalidación de queries vecinas. Si se cambia el schema, hay que actualizar hooks + estos archivos.

### 2.5 Feeding/Sleep Near-Idénticos — 🟡 ALTO (CONFIRMADO)

**Hallazgo:** `useFeedingSessions.ts` (319 lines) y `useSleepSessions.ts` (278 lines) comparten ~85% del mismo patrón:

| Aspecto | Código duplicado |
|---|---|
| Start session | Misma lógica: auto-finish activa existente, INSERT session + status event |
| Pause/Resume | Mismos 3 pasos (INSERT event + update status + timeline) |
| Finish | Mismo helper `_finish*Session()` con calcDurationSec |
| Queries | 4 queries gemelas (active, status, history, detail) |
| AsyncStorage | Misma línea `await AsyncStorage.getItem('active_profile_id')` ×4 cada archivo |

Asimetrías: `sleep` tiene timer en tiempo real (`useSleepPreciseElapsed`) que feeding no tiene. `feeding` tiene `useLastFeedingSession` que sleep no tiene.

**Impacto:** ~597 líneas duplicadas. Cualquier bug fix en sesiones requiere tocar ambos archivos. Alto riesgo de deriva.

### 2.6 AsyncStorage Key Dispersion — 🟡 MEDIO (NUEVO)

**Problema:** 10+ keys literales distribuidas en 9 archivos. `'active_profile_id'` aparece como string literal en 7 archivos distintos. No hay constantes centralizadas.

| Key | Archivos |
|---|---|
| `'active_profile_id'` | 7 hooks + `client.ts` |
| `pee_intensity_config` | 3 archivos (mismo grupo de 5 keys de pañal) |
| `poop_intensity_config` | 3 archivos |
| `active_baby_id` | 2 archivos + client.ts |
| `onboarding_done` | 2 archivos + client.ts |

Solo `themeStorage.ts` define constantes (`ACTIVE_KEY`, `CUSTOM_KEY`).

**Impacto:** Si se renombra una key (ej. `active_profile_id` → `profile_id`), hay que cazar 8 ocurrencias manualmente.

### 2.7 Home Density: 30 Elementos — 🟡 MEDIO (MEJORADO)

**Evolución vs v1:**
- v1: ~30 elementos visibles siempre + chips Rezagada/Recursos
- v2: ~28 siempre visibles (se eliminaron 2 chips) + flexWrap para mejor adaptación

| Categoría | Cuenta |
|---|---|
| Quick actions grid | 13 botones (11 fijos + 2 presets dinámicos) |
| Baby header (avatar + name + filter toggle) | 2 TouchableOpacity |
| Wake window bar | 1 TouchableOpacity (condicional) |
| Note input + send button | 2 elementos |
| Timeline items | N items (dinámico) |
| Filtros (condicional) | Hasta 16 adicionales |
| **Total siempre visibles** | **~18-28 según estado** |

**Mejora:** FlexWrap evita overflow en pantallas angostas. Menos densidad que v1. Pero sigue siendo la pantalla con más interacciones de la app.

### 2.8 catálogos.tsx: 1,142 Líneas — 🟡 MEDIO (MEJORADO)

**Evolución:** 2,272 → 1,142 (-50%). 8 componentes extraídos a `src/components/catalogs/`. Pero sigue siendo el archivo más grande de la app y contiene 5 tabs con formularios CRUD completos inline.

**Impacto:** El usuario no técnico sigue sin animarse a explorar esta pantalla. Para un dev, 1,142 líneas con estados mezclados sigue siendo complejo.

---

## 3. Cálculo de Esfuerzo de Interacción (CSIM v2)

### Tarea: Registrar pañal (Home → Pañal)

| Paso | Interacción | Puntos |
|---|---|---|
| 1 | Tap 🍑 Pañal | 1 |
| 2 | Esperar carga pantalla (push screen) | 3 |
| 3 | Tap intensidad pipí (ScaleMeter) | 1 |
| 4 | Tap intensidad popó (ScaleMeter) | 1 |
| 5 | Tap observación (si aplica) | 1 |
| 6 | Tap métrica observación (si aplica) | 1 |
| 7 | Tap 💾 Guardar Pañal | 1 |
| 8 | Esperar save + invalidación | 3 |
| **Total** | | **12 pts** |

**Sin cambios vs v1.** El refactor de pañal no tocó este flujo.

### Tarea: Crear plantilla (v2 — ahora con inputs nativos)

| Paso | Interacción | Puntos |
|---|---|---|
| 1 | Perfil → Catálogos | 1 clic + 3 navegación |
| 2 | Tap tab 📌 Plantillas | 1 |
| 3 | Tap "+ Nueva" | 1 |
| 4 | Escribir emoji | 2 |
| 5 | Escribir nombre | 2 |
| 6 | Seleccionar tipo evento | 1 |
| 7 | Ajustar slider/input numérico (antes: escribir JSON) | 1 |
| 8 | Tap toggle unidad (si aplica) | 1 |
| 9 | Tap toggle "Mostrar en inicio" | 1 |
| 10 | Tap Guardar | 1 |
| **Total** | | **14 pts** |

**Mejora:** 29 pts → 14 pts (-52%). La eliminación del JSON elimina la penalización cognitiva de 5 pts × 2 campos y reemplaza escritura (2 pts) por clics (1 pt). Sigue siendo alta (14 > 8 deseable) por la navegación y cantidad de campos.

### Tarea: Registrar temperatura

| Paso | Interacción | Puntos |
|---|---|---|
| 1 | Tap 🌡️ Salud | 1 |
| 2 | Tap checkbox temperatura | 1 |
| 3 | Tap preset 38.0° | 1 |
| 4 | Tap Guardar | 1 |
| **Total** | | **4 pts** |

**Sin cambios.** Ya estaba optimizado.

### Tarea: Tomar medición (peso)

| Paso | Interacción | Puntos |
|---|---|---|
| 1 | Tap 📏 Medir | 1 |
| 2 | Esperar carga pantalla | 3 |
| 3 | Ingresar peso (keyboard) | 1 |
| 4 | Tap 💾 Guardar | 1 |
| 5 | Esperar transacción + invalidación | 3 |
| **Total** | | **9 pts** |

---

## 4. Estimación SUS v2

| Factor | v1 | v2 | Cambio |
|---|---|---|---|
| Complejidad del Home | 40 | 50 | +25% (menos chips, flexWrap, tabs colapsables) |
| Editor plantillas | 25 | 70 | +180% (JSON eliminado) |
| Catálogo abrumador | 35 | 45 | +29% (split a 1,142 líneas) |
| Consistencia patrones | 55 | 50 | -9% (nuevos hallazgos: getDb directo, feeding/sleep duplicado) |
| Flujo tareas frecuentes | 65 | 65 | Sin cambios |
| Ayuda contextual | 45 | 45 | Sin cambios (solo temperatura) |
| Prevención errores | 30 | 40 | +33% (dual-write + batch fix, pero sin ErrorBoundary ni onError) |
| Percepción general | 50 | 55 | +10% |

**SUS ponderado v2: 58/100** (vs 52/100 en v1, +6 pts)

**Rango:** Sigue por debajo del promedio de 68 (rango D → D+). La app es usable para tareas diarias pero la configuración, la falta de manejo de errores y la inconsistencia arquitectónica la penalizan.

### Desglose

| Dimensión | Score | Cambio |
|---|---|---|
| Tareas básicas (pañal, toma, sueño, comida) | 75/100 | Sin cambios |
| Configuración y personalización | 55/100 | +30 pts (por inputs nativos) |
| Confianza y prevención de errores | 40/100 | +10 pts (por transactional save + batch serial) |
| Consistencia y predecibilidad | 50/100 | -5 pts (nuevos hallazgos arquitectónicos) |

---

## 5. Resumen de Problemas por Severidad

### 🔴 Críticos (arreglar ahora)

| # | Problema | Archivos | Solución propuesta |
|---|---|---|---|
| C1 | Sin ErrorBoundary global | `app/_layout.tsx` | Envolver `<Stack>` en `<ErrorBoundary>` con fallback UI |
| C2 | 92.6% mutations sin onError | Todos los hooks en `src/hooks/` | Añadir `onError` a cada `useMutation` con `console.error` + opción de callback externo |
| C3 | 9 JSON.parse inseguros | 7 archivos listados | Crear `safeJsonParse<T>(json, fallback)` utility y reemplazar todos |

### 🟡 Altos (siguiente sprint)

| # | Problema | Archivos | Solución propuesta |
|---|---|---|---|
| A1 | 6 app/ files usan getDb() directo | 6 archivos | Migrar a hooks dedicados o crear data layer |
| A2 | Feeding/Sleep duplicados | 2 hooks ~600 líneas | Hook genérico `useSession()` parametrizado por tabla |
| A3 | AsyncStorage keys dispersas | 9 archivos | `src/utils/storage.ts` con constantes + get/set tipados |
| A4 | 27 catches silenciosos | 10+ archivos | Revisar cada `catch {}` y decidir si loguear o ignorar intencionalmente |

### 🟢 Medios (backlog)

| # | Problema | Archivos | Solución propuesta |
|---|---|---|---|
| M1 | catálogos.tsx sigue en 1,142 líneas | `app/settings/catalogs.tsx` | Extraer cada tab a su propio screen o componente |
| M2 | home ~28 elementos siempre visibles | `app/(tabs)/index.tsx` | Mover filtros a slide-down o sheet, extraer QuickBtn |
| M3 | shareReport.ts duplica labels | `src/utils/shareReport.ts` | Importar constantes de hooks, no redefinir |
| M4 | useUpdateGrowthLog invalida mal | `src/hooks/useGrowthLogs.ts` | Añadir `'history'` a invalidación |

---

## 6. Scorecard Final

| Métrica | v1 | v2 | Diferencia |
|---|---|---|---|
| Líneas totales (app/ + src/hooks/) | ~9,550 | ~11,867 | +24% (crecimiento esperado) |
| CSIM — Pañal | 12 pts | 12 pts | Sin cambios |
| CSIM — Crear plantilla | 29 pts | **14 pts** | **-52%** 🎉 |
| CSIM — Temperatura | 4 pts | 4 pts | Sin cambios |
| CSIM — Medición peso | — | 9 pts | Nueva |
| SUS estimado | 52/100 | **58/100** | **+6 pts** |
| Problemas críticos | 3 | **3** (nuevos) | Rotación: JSON fix, entran ErrorBoundary/onError/JSON.parse |
| Archivos > 500 líneas | 5 de 33 | **6 de 27** | catálogos bajó de 2,272→1,142 pero stats (929) y diaper/id (893) crecieron |
| Componentes extraídos | — | 8 | ZoneEditor, EventMetricsEditor, ObservationForm, etc. |

---

## 7. Recomendaciones Priorizadas (v2)

### Sprint 1 — 🔴 Error Boundary Global + Safe JSON

1. **ErrorBoundary** (`src/components/ErrorBoundary.tsx`): Wrapper con `componentDidCatch`, muestra pantalla de error amigable con botón "Reintentar". Envolver `<Stack>` en `app/_layout.tsx`.

2. **`safeJsonParse<T>`** (`src/utils/safeJsonParse.ts`):
```ts
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}
```
Reemplazar los 9 usos inseguros.

### Sprint 2 — 🟡 onError en Mutaciones + Error UX

3. **Añadir `onError` a todas las mutations**. Patrón:
```ts
useMutation({
  mutationFn: ...,
  onSuccess: ...,
  onError: (e) => console.error('[useX]', e),
})
```
Además añadir opción de `onError` callback en el hook para que las pantallas puedan mostrar Alert custom.

4. **Feedback de error en pantallas**: Cuando una mutación falla, mostrar Alert o toast. Actualmente 18/40 Alert.alert son para errores, pero ninguno viene de hooks.

### Sprint 3 — 🟡 Data Layer

5. **Centralizar AsyncStorage**: Crear `src/utils/storage.ts` con keys como constantes tipadas y funciones `getProfileId()`, `setProfileId()`.

6. **Migrar getDb() directo de app/ a hooks**: Los 6 archivos que llaman getDb() deberían usar hooks existentes o crear hooks nuevos.

### Sprint 4 — 🟢 Arquitectura

7. **Hook genérico `useSession`**: Parametrizar feeding/sleep en un solo hook. Aprovechar que ambas tablas tienen estructura idéntica (session + status_events + calcDurationSec).

8. **Dividir catálogos.tsx en 5 screens**: Un screen por tab, o al menos 5 componentes extraídos.

---

## 8. Riesgos No Cubiertos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Error de renderizado no capturado | Media | **App crash / pantalla blanca** | ErrorBoundary (Sprint 1) |
| Mutación falla silenciosamente | Alta | **Data perdida sin aviso** | onError (Sprint 2) |
| JSON malformado en metadata | Media | **Pantalla específica crash** | safeJsonParse (Sprint 1) |
| Inconsistencia feeding/sleep | Media | **Bug fix solo en un lado** | useSession genérico (Sprint 4) |
| Crecimiento de home sin modularizar | Alta | **Archivo de 1,500+ líneas** | Extraer QuickBtn, modals (backlog) |

---

*Fin del informe v2. 58/100 SUS — Mejorando, pero con 3 nuevos críticos que requieren atención inmediata.*
