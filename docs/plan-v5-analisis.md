# Plan v5 — Arquitectura completa

## Principios de diseño
- **One-hand first**: bottom nav, acciones principales alcance del pulgar, sin laberintos
- **Timeline = registro rápido**: el chat es para LOGUEAR, no para analizar
- **Análisis = para ENTENDER**: calendario, resúmenes, curvas, patrones
- **Jerarquía clara**: 3 tabs abajo, contenido dentro con subtabs o secciones

---

## 1. Bottom Navigation (tres tabs)

```
┌──────────────────────────────────────────────┐
│  🏠 Home    📊 Análisis    👤 Perfil        │
│  (timeline)  (insights)    (config)          │
└──────────────────────────────────────────────┘
```

**Home** = timeline (chat) + quick actions. Nada más. Puro registro veloz.
**Análisis** = calendario, resúmenes, curvas, reportes. La vista para entender.
**Perfil** = bebé, settings, catálogos, temas, recursos.

---

## 2. Quick Actions del Dashboard

Fila circular one-hand:
```
[🤱 Pecho] [🍼 Leche] [💧 Pañal] [😴 Sueño] [📏 Medir] [+]
```

- `📏 Medir` unifica peso + talla + CC + fotos (múltiples imágenes) en un solo formulario
- `[+]` = "otro" → menú expandido con: 🛁 Baño, 🤸 Tummy Time, 🎮 Juego, 🤮 Vómito, 💊 Meds, 🌡️ Temp, 📝 Nota
- Los más usados se reordenan solos (o el usuario los personaliza desde Perfil)

---

## 3. Migración de eventos viejos

Los eventos existentes de tipo `weight`, `height`, `head_circumference` se migran a un solo evento `measurement`:
- Eventos en el mismo minuto se fusionan en una sola medición
- Eventos solitarios se convierten a `measurement` con solo ese valor
- Peso inicial de nacimiento del perfil del bebé se migra como primera medición
- Migración one-time, ejecutada al abrir la app después de la actualización

---

## 4. Sección "Análisis" — estructura completa

```
┌──────────────────────────────────────────────┐
│  📊 Análisis                                 │
│                                              │
│  [📅 Calendario] [📊 Resumen] [📈 Curvas]   │ ← subtabs horizontales
│  [📋 Historial]  [📤 Exportar]               │
└──────────────────────────────────────────────┘
```

### 📅 Calendario (vista mensual)
- Vista **mensual** con dots de colores (💧💩🤱😴📏🛁🤮) en cada día
- Tap en un día → sheet con resumen numérico + timeline vertical de ese día
- Navegación: swipe entre meses, botón "Hoy"
- **Patrones visuales**: detecta rachas (3 días sin popó, X popós líquidas seguidas)

### 📊 Resumen del día / semana / mes
Selector: [Hoy] [7 días] [30 días]

**Hoy:**
- 🧮 Pañales: X mojados · Y sucios · Z totales
- 🤱 Pecho: X sesiones · Y min total
- 🍼 Fórmula: X ml total
- 😴 Sueño: Xh Ym total · última ventana Xh (comparada con esperado para su edad)
- 📏 Última medición: X kg · Y cm · Z cm CC

**7 días:** mini gráficas de tendencias, alertas de patrón
**30 días:** curvas, comparativas, patrones generales

### 📈 Curvas de Crecimiento (OMS)
- Peso/edad, Talla/edad, CC/edad, IMC/edad
- Percentiles
- Fotos de crecimiento (múltiples por medición) en timeline visual

### 📋 Historial completo
- Todos los eventos, filtrable por tipo (pañal/toma/sueño/medición/comida/otros), rango de fecha (Hoy/7d/30d/Rango/Todo) y búsqueda por texto
- Agrupado por día, cada ítem linkea a su detalle
- Fecha rango custom con date picker nativo (estilo WhatsApp, Desde/Hasta)
- Accesible desde Perfil y Análisis

### 📤 Exportar
- Reporte PDF para pediatra

---

## 5. Ventanas de sueño (Wake Windows) — Automáticas

### Fuentes consultadas
- Cleveland Clinic (Dr. Barrett, pediatra)
- National Sleep Foundation
- HealthyChildren.org (AAP)
- Sleep.com (expertos en sueño pediátrico)
- Mustela USA (revisión médica)
- Dr. Craig Canapari, MD (director del Yale Pediatric Sleep Center)

### Cálculo automático
```
wake_window = inicio_siguiente_sueño - fin_anterior_sueño
```
Se calcula automáticamente entre sesiones de sueño registradas. Si solo hay una sesión, no se muestra ventana (comparamos con "ahora" para la ventana actual).

### Tabla de referencia por edad (consolidada de fuentes)

| Edad | Ventana esperada | Siestas/día | Sueño total/24h |
|------|-----------------|-------------|-----------------|
| 0-4 semanas | 35-60 min | 6+ | 15-18h |
| 1-2 meses | 60-90 min | 4-5 | 15-18h |
| 3-4 meses | 75-120 min (1.25-2h) | 3-4 | 14-15h |
| 5-7 meses | 2-3h | 3 | 14-15h |
| 7-10 meses | 2.5-3.5h | 2-3 | 13-14h |
| 11-14 meses | 3-4.5h | 1-2 | 12-14h |
| 14-24 meses | 4-6h | 1 | 12-14h |
| 2+ años | 5-7h si siesta | 0-1 | 11-13h |

### Display (compacto, sin barra de progreso)
```
⏳ 1h 15m despierto · siesta ≈ 10:30 — 11:30 AM
🫶 2h 45m despierto · ya quiere dormir
```

- Sin barra de progreso (evita ansiedad de "llenado")
- Muestra la **hora exacta** esperada de siesta, no el rango abstracto
- Formato 12h/24h según dispositivo

### Notas importantes
- La primera ventana del día suele ser la más corta
- La última ventana (antes de dormir) es la más larga
- Si la siesta fue corta (<45min), la siguiente ventana se acorta
- Mostrar siempre como "referencia", no como regla estricta
- Fuente: Cleveland Clinic, AAP, National Sleep Foundation

---

## 6. Alimentación complementaria

### Catálogo precargado (OMS/ESPGHAN) + personalizable

**Grupos de alimentos:**
- 🍎 Frutas (manzana, pera, plátano, papaya, aguacate...)
- 🥕 Verduras (zanahoria, calabaza, papa, camote, brócoli...)
- 🥩 Proteínas (pollo, res, pescado, huevo, tofu...)
- 🌾 Cereales (arroz, avena, quinoa, maíz...)
- 🧀 Lácteos (yogur, queso...)
- 🫘 Legumbres (frijol, lenteja, garbanzo...)

**Propiedades por alimento:**
- Laxante 💧 (papaya, ciruela, pera)
- Astringente 🪨 (plátano, manzana, arroz)
- Ambos 🔄
- Neutro ⚪

**Alérgenos mayores (seguimiento obligatorio):**
🥜🥚🐟🌰🫘🌾🥛

Registro de introducción: fecha, primera vez, reacción, foto

---

## 7. Dominios de datos (resumen)

| Dominio | Estado | Prioridad |
|---------|--------|-----------|
| 💧 Pañal | ✅ Completo | — |
| 🤱🍼 Alimentación (leche) | ✅ Base | F1 |
| 😴 Sueño | ✅ Base + wake windows | F2 |
| 📏 Crecimiento (unificado + fotos) | ✅ | F1 |
| 📅 Calendario mensual | ✅ | F1 |
| 📊 Resúmenes diarios/semanales | ✅ Mini semanal interactivo | F1 |
| 📋 Historial con filtros | ✅ | F2 |
| 🔍 Filtros en timeline (Inicio) | ✅ Tipo + fecha + texto + rango | F2 |
| 🕐 Formato hora 12h/24h auto | ✅ Detección automática | F2 |
| 🥣 Alimentación complementaria | ✅ | F4 |
| 🥜 Seguimiento alérgenos | Pendiente | F4 |
| 🛁 Actividades (tummy time, baño, juego, hitos) | Pendiente | F5 |
| 🤮 Salud (temperatura, medicamentos, síntomas) | Pendiente | F5 |
| 📤 Exportar PDF | Pendiente | F3 |
| 📈 Curvas OMS interactivas | ✅ Peso/talla/CC con percentiles y detalle matemático | F3 |

---

## 8. Formulario "📏 Medir"

```tsx
📏 Nueva medición — {fecha_hora}

Peso:    [____] kg (obligatorio)
Talla:   [____] cm (opcional)
CC:      [____] cm (opcional)

Fotos:   [+ Agregar foto] (múltiples, swipe gallery)
         [img1] [img2] [img3] +   

Nota:    [________________]

[💾 Guardar]
```

Se guarda como evento tipo `measurement`. En el timeline: `📏 3.2 kg · 54 cm · 36 cm · +2 fotos`

---

## 9. Preguntas respondidas (sesión actual)

1. **Eventos viejos** → Migrar a medición unificada, incluyendo peso inicial del perfil
2. **Wake windows** → Automáticos, con tabla de referencia por edad (Cleveland Clinic, AAP, NSF)
3. **Catálogo alimentos** → Precargado OMS + personalizable
4. **Calendario** → solo vista mensual por ahora
5. **Fotos crecimiento** → Múltiples imágenes por medición, en galería swipe

---

## 10. Fases de implementación

### Fase 1 — Base ✅
- [x] Bottom navigation (3 tabs)
- [x] Quick action 📏 Medir (unificado peso+talla+CC+fotos)
- [x] Migración de eventos viejos weight/height/CC a measurement
- [x] Análisis con subtabs: [📅 Calendario] [📊 Resumen] [📈 Curvas]
- [x] Resumen del día con contadores
- [x] Calendario mensual con dots + sheet diario

### Fase 2 — Sueño + Historial + Filtros ✅
- [x] Wake windows automáticos con tabla referencias
- [x] WakeWindowBar compacto sin barra de progreso, muestra hora de siesta
- [x] Historial completo con filtros (tipo, fecha, texto)
- [x] Filtro de fecha con rango custom (date picker nativo)
- [x] Filtros en Inicio (tipo, fecha, texto, rango) — colapsables
- [x] Mini gráfica semanal en Análisis con días tappables
- [x] Detección automática 12h/24h según dispositivo

### Fase 3 — Curvas OMS + Exportar ✅
- [x] Curvas interactivas peso/talla/CC (P3/P15/P50/P85/P97)
- [x] Tarjeta de percentil + histograma de percentiles en historial
- [x] PercentileDetailModal con desglose matemático (LMS, z-score, fórmula)
- [x] Edad en meses y semanas (formatAgeMonths)
- [x] Botón ✏️ editar medición (precarga valores + fotos)
- [x] Columna photo_uris en growth_logs para persistencia de fotos
- [x] Corrección del cálculo percentil OMS (Hastings CDF)
- [ ] Exportar PDF

### Fase 4 — Complementaria ✅
- [x] Catálogo de alimentos OMS
- [x] Registro de alimentación complementaria
- [x] Seguimiento de alérgenos (automático desde food_logs × food_catalog.allergens)
- [x] Grupos de alimentos en español con emojis
- [x] Multi‑select de alimentos (combinar varios en un registro)
- [x] Foto en registro de comida
- [x] Registro rápido de nuevo alimento + alérgenos
- [x] Editor completo de catálogo (nombre, emoji, grupo, propiedad, alérgenos)
- [x] Eliminación física (sin registros) / soft‑delete (con registros, hidden=true)
- [x] Teclado responsivo en todos los formularios (KeyboardAvoidingView)

### Fase 5 — Actividades + Salud
- [ ] Tummy Time, Baño, Juego, Hitos
- [ ] Temperatura, Medicamentos, Síntomas
- [ ] Exportar PDF completo para pediatra

---

## 12. Correcciones técnicas

### Cálculo de percentiles (abril 2026)
- `zToPercentile()` usaba una fórmula incorrecta (Strecok mal implementada) → daba P66 para z=2.49 cuando debía ser P99+
- Reemplazada con aproximación de Hastings para la CDF normal estándar (error ≤ 7.5×10⁻⁸)
- Verificado contra valores OMS publicados: P50 al nacer = 3.2322 kg ✅

### Migración multi-statement (mayo 2026)
- `execAsync` con 12 CREATE TABLE en una sola llamada causaba NullPointerException en Android
- Dividido en `execAsync` individuales
- Agregada columna `photo_uris TEXT` a `growth_logs` vía ALTER TABLE

### Columna hidden en food_catalog (mayo 2026)
- `ALTER TABLE food_catalog ADD COLUMN hidden INTEGER DEFAULT 0`
- Para soft‑delete: alimentos con registros se ocultan (hidden=true) pero el historial los sigue mostrando
- Sin registros → DELETE físico
- `useFoodCatalog()` filtra `hidden = false`; `useFoodCatalogAll()` incluye todo (para el editor)

---

## 11. Backlog adicional
- Tip/tranquilidad contextual cuando hay múltiples popós líquidas en poco tiempo
- Personalización de quick actions (orden, cuáles mostrar)
- Notificaciones de ventanas de sueño
- Vista año (heatmap tipo GitHub contributions)
- **Recetario / comidas preparadas**: agrupar múltiples alimentos ya probados en "platillos" prefabricados (ej: "calabacitas con pollo y arroz"). Multi‑select ya implementado; a futuro se puede guardar la combinación como receta reusable.
- **Editor recetas**: nombre, emoji, lista de ingredientes (del catálogo), instrucciones, foto del plato. Asociar a un log de comida con un solo tap.
- **Batch logging de recetas**: al seleccionar una receta, se registran automáticamente todos sus ingredientes como food_logs individuales (para tracking de alérgenos) y se agrupan visualmente en el timeline.
