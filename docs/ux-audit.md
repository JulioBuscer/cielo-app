# Auditoría de Complejidad UX — Cielo App

**Fecha:** 27 de mayo de 2026
**Auditor:** Análisis automatizado sobre código fuente
**Versión:** Commit 5e857b7

---

## 1. Evaluación Heurística de Complejidad

### 1.1 Consistencia y Estándares

| Problema | Gravedad | Impacto |
|---|---|---|
| **Dos patrones de guardado distintos**: `useSaveTimelineEvent` (hook) en 8 pantallas, pero `getDb().insert(timelineEvents)` directo en `food/new.tsx` y `useQuickSavePreset`. | **Alta** | El desarrollador y future maintainer tienen que saber cuándo usar cada patrón. Rompe el principio de "una forma correcta de hacer las cosas". |
| **History usa queries raw del DB** (`useQuery` con `drizzle-orm` directo), mientras que Home usa hooks dedicados (`useTimeline`, `useFeedingHistory`, etc.). Misma data, dos implementaciones. | **Media** | Mayor riesgo de bugs si cambia el schema: hay que actualizar dos lugares. |
| **Nomenclatura inconsistente**: `app/(tabs)/index.tsx` es "Inicio", pero `app/(tabs)/analisis.tsx` mezcla español en el nombre del archivo con el contenido en español. `_layout.tsx` y componentes en inglés. | **Baja** | No afecta al usuario, pero indica falta de convención en el equipo. |
| **ScaleMeter** se usa en múltiples formas (pañal, event) pero está definido inline en `diaper/new.tsx` en vez de ser un componente compartido. | **Media** | Duplicación de código y esfuerzo de mantenimiento. |

### 1.2 Carga de Memoria del Usuario

| Problema | Gravedad | Impacto |
|---|---|---|
| **Editor de plantillas requiere escribir JSON** (`{"dose":1}`, `{"dose":"drop"}`). Una mamá o papá cansado no debería tener que aprender sintaxis JSON para configurar un medicamento recurrente. | **Crítica** | Altísima fricción. La función de presets queda inaccesible para el 90% de los usuarios. |
| **El formulario genérico de eventos** (`event/new.tsx`) tiene dos pasos: (1) elegir tipo de evento entre una cuadrícula, (2) rellenar métricas. Si el usuario se equivoca de tipo, tiene que volver atrás. El estado "dónde estoy en el flujo" no es obvio. | **Media** | El usuario puede sentirse perdido entre paso 1 y paso 2. |
| **5 configuraciones de pañal** (intensidad pipí, salud pipí, intensidad popó, salud popó, consistencia) cargadas desde AsyncStorage con valores por defecto. El usuario no sabe qué valores están configurados ni dónde cambiarlos. | **Alta** | Las escalas pueden mostrar comportamientos inesperados si el usuario no recuerda haberlas personalizado. |
| **12 síntomas en grid** en la pantalla Salud. Sin agrupar ni categorizar. El usuario tiene que escanear 12 opciones cada vez. | **Baja-Media** | Para uso frecuente, el usuario aprende las posiciones. Pero para uso esporádico, hay sobrecarga. |

### 1.3 Flexibilidad y Eficiencia

| Problema | Gravedad | Impacto |
|---|---|---|
| **El Home orquesta 10 queries + 4 modals + filtros inline + timeline + wake windows.** La pantalla hace demasiadas cosas. Cualquier error en una query puede dejar toda la pantalla inútil. | **Alta** | Frágil. Una query que falle (ej. error de DB) tira toda la página. |
| **Quick actions son fijas** (9 botones en grilla). Las plantillas (presets) se agregaron después como una fila extra, no integradas. Doble sistema de accesos directos. | **Media** | El usuario tiene dos lugares para "atajos": los botones grandes y la fila de plantillas. No hay unificación. |
| **El botón "➕ Evento" abre un picker modal** que lista todos los tipos de evento, pero excluye "pañal" (tiene su propio botón). El usuario tiene que saber esta regla implícita. | **Baja** | Pequeña fricción de descubrimiento. |
| **El formulario Salud permite guardar múltiples eventos a la vez** (temperatura + medicamento + síntomas + tipos custom) en `Promise.all`. No hay retroalimentación granular si uno falla. | **Media** | Si uno de 4 eventos falla, el Alert dice "Error" genérico sin decir cuál. |

### 1.4 Prevención y Manejo de Errores

| Problema | Gravedad | Impacto |
|---|---|---|
| **JSON sin validación** en el editor de plantillas. Si el usuario escribe `{dose: 1}` (sin comillas), el JSON.parse lanza excepción y se guarda `{}`. Sin aviso al usuario. | **Crítica** | Datos silenciosamente corruptos. El preset se guarda pero sin valores. |
| **Dual-write en growth** (escribe a `growthLogs` Y `timelineEvents`). Si falla el segundo write, el primero ya se ejecutó. No hay rollback ni reconciliación. | **Alta** | Inconsistencia de datos. Mediciones que existen en una tabla pero no en la otra. |
| **El batch save de Salud** usa `Promise.all` — si una promesa rechaza, las demás igual se ejecutaron. No hay rollback. | **Alta** | Eventos parcialmente guardados. |
| **Los ALTER TABLE están envueltos en try/catch silencioso**: si fallan, se traga el error y se asume que la columna ya existe. Correcto para migraciones, pero puede ocultar errores reales. | **Baja** | Bajo riesgo porque están al inicio de la vida de la app. |
| **Las migraciones multi-statement** se partieron en llamadas individuales para evitar NullPointerException en Android. Esto indica fragilidad en la capa de DB. | **Media** | Síntoma de que `expo-sqlite` tiene limitaciones que requieren workarounds. |

### 1.5 Ayuda y Documentación Integrada

| Problema | Gravedad | Impacto |
|---|---|---|
| **La pantalla Recursos** es completa pero está a 3 clics de profundidad (Perfil → Recursos). El usuario no la encuentra en el momento que la necesita. | **Media** | La ayuda debería estar disponible en contexto (ej. un "?" junto a la escala popó). |
| **La nota de temperatura** ("🫶 Los bebés suelen tener temperatura más alta...") es buen ejemplo de ayuda contextual. Pero es la única pantalla que lo hace. | **Baja** | Buen patrón, debería replicarse. |
| **Los campos JSON del editor de plantillas** no tienen ayuda ni tooltip. El placeholder `{"dose":1}` asume que el usuario sabe JSON. | **Crítica** | Barrera de entrada total para usuarios no técnicos. |

### 1.6 Densidad de Información y Jerarquía Visual

| Problema | Gravedad | Impacto |
|---|---|---|
| **Catálogo editor (2,272 líneas)**: 5 tabs, cada uno con formularios anidados, editores de zonas, colores, métricas. La densidad de información es abrumadora. | **Crítica** | El usuario no técnico (mamá/papá) difícilmente se atreverá a tocar esta pantalla. |
| **Home screen**: Fila de filtros (7 chips) + fila fecha (5 chips) + barra búsqueda + 9 quick actions + fila plantillas + 2 chips secundarios + input nota + timeline. Hay ~30 elementos interactivos en la vista principal. | **Alta** | El usuario recibe demasiados estímulos al abrir la app. La tarea principal (loguear rápido) compite con mucha UI. |
| **Pantalla Salud**: 3 secciones acordeón con toggle checkbox. Cuando las 3 están expandidas, hay ~20 inputs visibles. Para una tarea que debería ser rápida (tomar temperatura), hay mucha UI. | **Media** | El acordeón ayuda, pero cada sección tiene su propia complejidad interna. |
| **Timeline items**: cada burbuja muestra emoji, label, valores, notas, footer. Para eventos con muchos tags (pañal con observaciones), la card se alarga mucho. | **Baja** | Aceptable para un timeline tipo chat. |

---

## 2. Cálculo de Esfuerzo de Interacción (adaptación CSIM)

### Tarea principal identificada: **Registrar un cambio de pañal**

Es la tarea más frecuente (múltiples veces al día en un bebé de 0-12 meses) y la que debería ser más rápida.

#### Flujo actual (Home → Pañal)

| Paso | Interacción | Tipo | Puntos |
|---|---|---|---|
| 1 | Abrir app (ya está abierta, asumimos) | — | 0 |
| 2 | Tocar botón "🍑 Pañal" en quick actions | Clic | 1 |
| 3 | Esperar carga de pantalla | Navegación | 3 |
| 4 | Seleccionar intensidad pipí (tocar en ScaleMeter) | Clic | 1 |
| 5 | Seleccionar intensidad popó (tocar en ScaleMeter) | Clic | 1 |
| 6 | Si hay observación (ej. sangre): tocar para expandir | Clic | 1 |
| 7 | Si la observación tiene métrica: ajustar valor | Clic | 1 |
| 8 | Tocar "Guardar" | Clic | 1 |
| 9 | Esperar save + invalidación queries | Navegación | 3 |
| | **Total** | | **12 pts** |

#### Flujo óptimo (imaginado)

| Paso | Interacción | Tipo | Puntos |
|---|---|---|---|
| 1 | Tocar "🍑" desde home | Clic | 1 |
| 2 | Un tap para intensidad (pipí+popó integrados o default) | Clic | 1 |
| 3 | Tocar "Guardar" | Clic | 1 |
| | **Total** | | **3 pts** |

**Puntuación de Esfuerzo Bruto actual:** 12 puntos
**Meta de referencia:** 5 puntos (una tarea sencilla debería ser ≤ 5 en una app de tracking infantil)
**Diferencia:** 2.4× más esfuerzo del necesario.

### Tarea secundaria: **Registrar temperatura**

| Paso | Interacción | Tipo | Puntos |
|---|---|---|---|
| 1 | Tocar "🌡️ Salud" | Clic | 1 |
| 2 | Tocar checkbox temperatura para activar sección | Clic | 1 |
| 3 | Tocar preset 38.0° (o escribir manualmente) | Clic | 1 |
| 4 | (Opcional) leer nota informativa | — | 0 |
| 5 | Tocar "Guardar" | Clic | 1 |
| | **Total** | | **4 pts** |

Este flujo está bien optimizado (4 pts). El problema está en la **configuración** (crear un preset de medicamento = 15+ pts por el JSON).

### Tarea: **Crear plantilla OneDrop 1 gota**

| Paso | Interacción | Tipo | Puntos |
|---|---|---|---|
| 1 | Perfil → Catálogos | Clic + Navegación (3 pts) | 4 |
| 2 | Tocar tab "📌 Plantillas" | Clic | 1 |
| 3 | Tocar "+ Nueva" | Clic | 1 |
| 4 | Escribir emoji | Escritura | 2 |
| 5 | Escribir nombre | Escritura | 2 |
| 6 | Tocar tipo de evento (💊 Medicamento) | Clic | 1 |
| 7 | **Escribir JSON `{"dose":1}`** | **Escritura (alta carga cognitiva)** | **2+5 penalización = 7** |
| 8 | **Escribir JSON `{"dose":"drop"}`** | **Escritura (alta carga cognitiva)** | **2+5 penalización = 7** |
| 9 | Escribir notas (opcional) | Escritura | 2 |
| 10 | Tocar toggle "Mostrar en inicio" | Clic | 1 |
| 11 | Tocar "Guardar" | Clic | 1 |
| | **Total** | | **29 pts** |

**Conclusión:** 29 puntos para una tarea que debería ser 5-8 puntos (seleccionar tipo de evento → poner nombre → poner dosis → guardar). La necesidad de escribir JSON manualmente multiplica el esfuerzo por ~4× y añade una barrera cognitiva enorme.

---

## 3. Estimación de Puntuación SUS (System Usability Scale)

**Puntuación estimada: 52/100**

| Factor | Peso | Notas |
|---|---|---|
| **Complejidad del Home** | 40 | Demasiados elementos en la pantalla principal. El usuario puede sentirse abrumado al abrir la app. |
| **JSON en editor de plantillas** | 25 | Barrera crítica. Usuarios no técnicos no pueden usar esta función. |
| **Catálogo abrumador (2,272 líneas)** | 35 | La pantalla de configuración es intimidante. Un usuario típico no se atreverá a explorarla. |
| **Consistencia de patrones** | 55 | Mezcla de hooks y DB directo, pero dentro de todo predecible. |
| **Flujo de tareas frecuentes** | 65 | Las tareas del día a día (pañal, toma, sueño) están bien optimizadas. El problema está en la configuración. |
| **Ayuda contextual** | 45 | Solo hay ayuda en temperatura. El resto de pantallas asume que el usuario sabe lo que hace. |
| **Prevención de errores** | 30 | JSON sin validación, dual-write sin rollback, batches sin manejo granular. |
| **Percepción general** | 50 | La app se siente "para papás técnicos" más que "para cualquier papá". |

**Desglose:**
- Aprendizaje rápido para tareas básicas (pañal, toma, sueño, comida): **75/100**
- Configuración y personalización (catálogos, plantillas, temas): **25/100**
- Confianza y prevención de errores (miedo a hacer algo mal): **40/100**
- Consistencia y predecibilidad: **55/100**

**SUS ponderado: 52/100** — Esto lo coloca en el rango "D" (OK-ish) en la escala de Sauro-Lewis, por debajo del promedio de 68. La app cumple su función básica pero la complejidad de configuración y la falta de pulido en errores lastran la experiencia.

---

## 4. Resumen Ejecutivo y Recomendaciones

### Veredicto

| Tipo de usuario | Complejidad | Explicación |
|---|---|---|
| **Usuario nuevo (mamá/papá primerizo)** | **Alta** | La pantalla de inicio abruma. El catálogo asusta. Las plantillas requieren JSON. El usuario medio abandonará la configuración avanzada y usará solo lo básico. |
| **Usuario experto (papá técnico / power user)** | **Media** | Puede navegar la complejidad, pero la inconsistencia de patrones y la falta de validación le hará perder tiempo y confianza. |

### Recomendaciones (ordenadas por impacto)

#### 🔴 1. Reemplazar JSON por inputs nativos en editor de plantillas (Crítica — impacto inmediato)

**Problema:** El formulario de plantillas pide `{"dose":1}` como texto libre.
**Solución:** Cuando el usuario selecciona un tipo de evento, leer sus `metrics` del schema y renderizar inputs nativos:
- Para `medication` con métrica `dose` (milliliter): mostrar un slider/input numérico con label "Dosis (mL)" y toggle de unidad (mL/gotas/sobre).
- Si no hay métricas definidas, mostrar solo nombre + emoji.
**Beneficio:** Reduce 29 pts CSIM → ~8 pts. Abre las plantillas al 100% de usuarios.

#### 🔴 2. Dividir el Home en secciones colapsables o scroll por defecto (Alta)

**Problema:** 30+ elementos interactivos compitiendo.
**Solución:** 
- Mover filtros a un drawer o sección colapsable (ya hay un toggle pero está al inicio, añadir estado cerrado por defecto).
- Integrar las plantillas de acceso directo DENTRO de la grilla de quick actions (no como fila separada).
- Unificar el sistema de "accesos directos": que las plantillas con ⚡ aparezcan como QuickBtn reemplazando a "➕ Evento" si hay muchas.
**Beneficio:** Reduce densidad visual ~40%. El usuario ve lo que necesita.

#### 🟡 3. Split del catálogo editor en archivos separados (Alta — mantenibilidad)

**Problema:** 2,272 líneas, 8 subcomponentes inline.
**Solución:** Mover `ZoneEditor`, `EventMetricsEditor`, `ObservationForm`, `PeeConfigSection`, `PoopConfigSection`, `ThemeToggle` a `/src/components/catalogs/` como módulos individuales. El archivo principal solo importa y renderiza.
**Beneficio:** Mantenibilidad, testabilidad, legibilidad. No afecta UX directamente pero reduce riesgo de bugs.

#### 🟡 4. Manejo de errores en batches y dual-writes (Alta — integridad de datos)

**Problema:** `Promise.all` en Salud sin rollback; dual-write en growth sin transacción.
**Solución:** 
- En Salud: ejecutar saves en serie con try/catch por cada uno, mostrar feedback granular ("Temperatura guardada, pero el medicamento falló").
- En Growth: usar transacción SQLite para el dual-write, o mejor aún: hacer que `growthLogs` sea la fuente de verdad y timeline_events se alimente de ella (event sourcing ligero).
**Beneficio:** Elimina datos inconsistentes silenciosos.

#### 🟢 5. Unificar patrón de guardado (Media)

**Problema:** 3 formas de guardar un timeline event: (a) hook `useSaveTimelineEvent`, (b) `getDb().insert(timelineEvents)` directo, (c) `useQuickSavePreset` que también hace insert directo.
**Solución:** Que `useQuickSavePreset` y `food/new.tsx` usen `useSaveTimelineEvent` o que el hook sea un wrapper que todos usen. Un solo punto de entrada.
**Beneficio:** Predictibilidad, facilidad para añadir lógica transversal (ej. analytics, sync).

---

### Scorecard final

| Métrica | Valor | Evaluación |
|---|---|---|
| Líneas de código totales (solo frontend) | ~9,550 | Moderado para una app de tracking |
| CSIM — Pañal (tarea principal) | 12 pts | 2.4× sobre la meta de 5 |
| CSIM — Crear plantilla | 29 pts | 3.6× sobre la meta de 8 |
| SUS estimado | 52 / 100 | Por debajo del promedio (68) |
| Problemas críticos (JSON, errores silenciosos) | 3 | Requieren atención inmediata |
| Archivos > 500 líneas | 5 de 33 | Señal de déficit de modularización |

---

*Fin del informe. Las recomendaciones están priorizadas por impacto en UX vs. esfuerzo de implementación.*
