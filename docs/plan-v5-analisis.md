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

- `📏 Medir` reemplaza weight/height/head_circumference como eventos sueltos
- `[+]` = "otro" → menú expandido con: 🛁 Baño, 🤸 Tummy Time, 🎮 Juego, 🤮 Vómito, 💊 Meds, 🌡️ Temp, 📝 Nota
- Los más usados se reordenan solos (o el usuario los personaliza desde Perfil)

---

## 3. Sección "Análisis" — estructura completa

```
┌──────────────────────────────────────────────┐
│  📊 Análisis                                 │
│                                              │
│  [📅 Calendario] [📊 Resumen] [📈 Curvas]   │ ← subtabs horizontales
│  [📋 Historial]  [📤 Exportar]               │
└──────────────────────────────────────────────┘
```

### 📅 Calendario (inspirado en Flo)
- Vista **mensual** con dots de colores (💧💩🤱😴📏) en cada día
- Tap en un día → cards apiladas de ese día (resumen + eventos)
- Vista **semanal** (swipe horizontal)
- Vista **diaria** → timeline vertical de ese día
- **Patrones visuales**: detecta rachas (3 días sin popó → posible estreñimiento)
- Navegación: deslizar entre meses, botón "Hoy"

### 📊 Resumen del día / semana / mes
Selector arriba: [Hoy] [7 días] [30 días] [Personalizado]

**Hoy:**
- 🧮 Pañales: X mojados · Y sucios · Z totales
- 🤱 Pecho: X sesiones · Y min total · Z min promedio
- 🍼 Fórmula: X ml total
- 😴 Sueño: Xh Ym total · última ventana Xh
- 📏 Última medición: X kg · Y cm

**7 días (tendencias):**
- Mini gráfica de pañales mojados/día
- Horas sueño promedio
- Número de tomas/día
- ⚠️ Alertas: "Baby tuvo X popós líquidas en Y días"

**30 días (patrones generales):**
- Curva de peso (si hay suficientes mediciones)
- Patrón de sueño (se duerme más tarde? más siestas?)
- Comparativa períodos

### 📈 Curvas de Crecimiento (OMS)
- Peso/edad (0-24m o 0-5a según edad)
- Talla/edad
- CC/edad
- IMC/edad
- Percentiles marcados en la curva
- **Fotos de crecimiento**: timeline visual con fotos del bebé en cada medición

### 📋 Historial completo
- Lista de TODOS los eventos, ordenados por fecha descendente
- **Filtros**: por tipo (pañal/toma/sueño/medición/actividad/salud), por fecha, por texto
- Tap → detail page
- **Búsqueda** por texto en notas

### 📤 Exportar / Compartir
- Reporte resumen para pediatra (PDF)
- Período seleccionable
- Incluye: resumen de pañales, alimentación, sueño, curva de crecimiento

---

## 4. Dominios de datos (todos los tipos de evento)

### 4.1 🍼 Alimentación
| Subtipo | Datos | Estado |
|---------|-------|--------|
| 🤱 Pecho | Izquierdo/derecho, duración, cuál terminó | ✅ |
| 🍼 Fórmula | Volumen ml, marca, preparación | ✅ |
| 🥣 **Complementaria** | Alimento, grupo, cantidad, reacción | 🆕 |
| 🥜 **Alérgenos** | Cuál, fecha, reacción, nivel exposición | 🆕 |

**Complementaria — estructura de alimentos:**
- **Grupos**: frutas, verduras, proteínas, cereales, lácteos, legumbres
- **Propiedades**: laxante, astringente, ambos, neutro
- **Seguimiento**: primera vez, aceptación, textura (puré/triturado/sólido)
- **Alérgenos mayores**: huevo, pescado, mariscos, cacahuate, nueces, soya, trigo, leche — llevar registro de cuándo se introdujo cada uno y reacción

### 4.2 😴 Sueño
| Dato | Estado |
|------|--------|
| Inicio/fin de sesión | ✅ |
| Ventanas de sueño (wake windows) | 🆕 |
| Calidad (inquieto/tranquilo) | 🆕 |
| Patrón semanal | 🆕 |
| Cómputo automático de ventanas entre sesiones | 🆕 |

### 4.3 💧 Pañal
| Dato | Estado |
|------|--------|
| Pipí intensidad + color | ✅ |
| Popó intensidad + color + consistencia | ✅ |
| Observaciones (sangre, moco) | ✅ |
| Peso del pañal | ✅ |
| Foto | ✅ |

### 4.4 📏 Crecimiento
| Dato | Estado |
|------|--------|
| Peso | ✅ (separado) |
| Talla | ✅ (separado) |
| CC | ✅ (separado) |
| **Unificado 📏** | 🆕 |
| Curva OMS | 🆕 |
| Fotos de crecimiento | 🆕 |

### 4.5 🛁 Actividades
| Tipo | Datos |
|------|-------|
| Tummy Time | Duración, estado (feliz/lloró), foto |
| Baño | Duración, productos usados |
| Juego | Tipo, con quién |
| Paseo | Duración, clima |
| **Hitos** | Cuál, fecha, descripción, foto (ej: "rodó por primera vez") |

### 4.6 🤮 Salud
| Tipo | Datos |
|------|-------|
| Temperatura | °C, método, síntomas |
| Medicamento | Nombre, dosis, vía |
| Vómito | Cantidad, aspecto |
| Síntomas | Tos, congestión, erupción, etc. |
| Dentición | Cuál diente, fecha, molestias |

---

## 5. Calendario — vista unificada

El calendario es el **corazón de Análisis**. Muestra todo en un solo vistazo:

**Vista mensual:**
```
     Abril 2026
  L  M  M  J  V  S  D
          1  2  3  4  5
  ●● ●  ●  ●  ●● ●● ●
  6  7  8  9  10 11 12
  ●  ●● ●  ●  ●  ●  ●
```

Cada día tiene dots de colores:
- 💧 azul = pipí
- 💩 marrón = popó
- 🤱 rosa = pecho
- 🍼 naranja = fórmula/biberón
- 😴 azul oscuro = sueño
- 📏 verde = medición
- 🛁 celeste = baño/actividad
- 🤮 rojo = salud/meds

**Tap en día** → sheet con:
- Resumen numérico del día
- Timeline vertical con los eventos

**Doble tap** → detalle completo del día

**Vista semana**: swipe horizontal, 7 columnas con eventos apilados

**Vista año**: heatmap (como GitHub contributions pero con colores de eventos)

---

## 6. Estrategia de implementación (por fases)

### Fase 1 — Base (ahora)
- ✅ Bottom navigation (3 tabs)
- ✅ Quick actions: +📏 (unificar peso/talla/CC)
- ✅ Eliminar weight/height/CC como eventos sueltos
- ✅ Análisis con subtabs: [📅 Calendario] [📊 Resumen] [📈 Curvas]
- ✅ Resumen del día con contadores
- ✅ Formulario 📏 Medir

### Fase 2 — Calendario + Historial
- [ ] Vista calendario mensual con dots
- [ ] Tap en día → sheet resumen
- [ ] Historial completo con filtros
- [ ] Búsqueda
- [ ] Wake windows automáticos

### Fase 3 — Curvas OMS + Fotos
- [ ] Curvas de crecimiento interactivas
- [ ] Fotos de crecimiento
- [ ] Reporte exportable

### Fase 4 — Complementaria
- [ ] Catálogo de alimentos
- [ ] Registro de alimentación complementaria
- [ ] Seguimiento de alérgenos
- [ ] Tabla de propiedades (laxante/astringente)

### Fase 5 — Actividades + Salud
- [ ] Tummy Time, Baño, Juego, Hitos
- [ ] Temperatura, Medicamentos, Síntomas
- [ ] Vista año / heatmap
- [ ] Exportar PDF para pediatra

---

## 7. Preguntas a definir

1. **Crecimiento**: unificamos peso+talla+CC en un solo evento "📏 Medición". ¿Los eventos antiguos (weight, height, head_circumference separados) los migramos a un solo evento o los dejamos como están?

2. **Wake windows**: ¿las calculamos automáticamente entre sesiones de sueño o el usuario las registra manual?

3. **Alimentación complementaria**: ¿carga de alimentos desde un catálogo precargado (OMS/ESPGHAN) o 100% libre?

4. **Calendario**: las vistas de semana y año las dejamos para después y empezamos solo con mensual?

5. **Fotos de crecimiento**: ¿las asociamos al evento 📏 Medición o van en una galería aparte?
