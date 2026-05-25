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
- Todos los eventos, filtrable por tipo, fecha, texto
- Búsqueda

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

### Display
```
😴 Ventana de sueño
   · 2h 15m · Esperado: 2h - 3h ✅
   · Antes de siesta #2
   
😴 Ventana de sueño  
   · 4h 30m · Esperado: 2.5h - 3.5h ⚠️
   · Posible sobrecansancio
```

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
| 😴 Sueño | ✅ Base + wake windows 🆕 | F2 |
| 📏 Crecimiento (unificado + curvas + fotos) | 🆕 | F1 |
| 📅 Calendario mensual | 🆕 | F1 |
| 📊 Resúmenes diarios/semanales | 🆕 | F1 |
| 📋 Historial con filtros | 🆕 | F2 |
| 🥣 Alimentación complementaria | 🆕 | F4 |
| 🥜 Seguimiento alérgenos | 🆕 | F4 |
| 🛁 Actividades (tummy time, baño, juego, hitos) | 🆕 | F5 |
| 🤮 Salud (temperatura, medicamentos, síntomas) | 🆕 | F5 |
| 📤 Exportar PDF | 🆕 | F3 |
| 📈 Curvas OMS interactivas | 🆕 | F3 |

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

### Fase 1 — Base (siguiente)
- [ ] Bottom navigation (3 tabs)
- [ ] Quick action 📏 Medir (unificado peso+talla+CC+fotos)
- [ ] Migración de eventos viejos weight/height/CC a measurement
- [ ] Análisis con subtabs: [📅 Calendario] [📊 Resumen] [📈 Curvas]
- [ ] Resumen del día con contadores
- [ ] Calendario mensual con dots + sheet diario

### Fase 2 — Sueño + Historial
- [ ] Wake windows automáticos con tabla referencias
- [ ] Historial completo con filtros y búsqueda
- [ ] Vista semanal en resumen

### Fase 3 — Curvas OMS + Exportar
- [ ] Curvas interactivas peso/talla/CC/IMC
- [ ] Galería de fotos de crecimiento
- [ ] Exportar PDF

### Fase 4 — Complementaria
- [ ] Catálogo de alimentos OMS
- [ ] Registro de alimentación complementaria
- [ ] Seguimiento de alérgenos

### Fase 5 — Actividades + Salud
- [ ] Tummy Time, Baño, Juego, Hitos
- [ ] Temperatura, Medicamentos, Síntomas
- [ ] Exportar PDF completo para pediatra

---

## 11. Backlog adicional
- Tip/tranquilidad contextual cuando hay múltiples popós líquidas en poco tiempo
- Personalización de quick actions (orden, cuáles mostrar)
- Notificaciones de ventanas de sueño
- Vista año (heatmap tipo GitHub contributions)
