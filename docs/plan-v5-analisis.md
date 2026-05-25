# Plan v5 — Análisis, Crecimiento y Navegación

## Objetivo
Unificar crecimiento, historial y estadísticas en una sola sección "Análisis" con navegación inferior tipo tabs. Eliminar laberintos UX.

## 1. Bottom Navigation (nuevo)
```
┌──────────┬────────────┬──────────┐
│ 🏠 Home  │ 📊 Análisis│ 👤 Perfil│
└──────────┴────────────┴──────────┘
```
- **Home** = dashboard actual (timeline + quick actions)
- **Análisis** = reemplaza `/stats`, agrupa resumen/crecimiento/historial/exportar
- **Perfil** = settings, baby profile, catálogos, temas, etc. (mover `/settings` aquí)

Se elimina la barra inferior actual de quick links (Stats, Rezagada, Recursos) y se reubica.

## 2. Quick Actions del Dashboard
Se mantienen los botones circulares actuales (💧🤱🍼, etc) + se **agrega**:
- `📏 Medir` — formulario unificado peso + talla + CC (reemplaza eventos separados)

Los eventos separados de `weight`, `height`, `head_circumference` como tipo de evento **se eliminan del selector de eventos**. Los existentes se muestran en el timeline con el icono 📏.

## 3. Sección "Análisis" (antes Stats)
Una sola pantalla con **tabs horizontales deslizables** (sin scroll infinito):

### 📊 Resumen del día
- Contador pañales mojados / sucios (hoy)
- Contador tomas (hoy) con total ml/tiempo
- Horas de sueño acumuladas
- Tarjeta compacta one-hand (scroll vertical, información jerárquica)

### 📈 Crecimiento
- Curva OMS (peso/talla/CC para la edad) — misma que teníamos planeada
- Tabla debajo con todas las mediciones registradas
- Botón "📏 Nueva medición" que abre el mismo form que el quick action

### 📋 Historial completo
- Todos los eventos, filtrable por tipo (pañal, toma, sueño, medición, nota)
- Filtro por fecha (calendario o selector rápido: hoy/7d/30d)
- Búsqueda por texto

### 📤 Exportar
- Reporte resumen para compartir (PDF/texto)
- Período seleccionable

## 4. Formulario "📏 Medir"
Reemplaza los eventos `weight`, `height`, `head_circumference` separados:
```tsx
- Peso: [____] kg (obligatorio)
- Talla: [____] cm (opcional)
- CC:    [____] cm (opcional)
- Nota:  [____]
```
Se guarda como un solo evento con metadata unificada. En el timeline se muestra como `📏 3.2 kg · 54 cm · 36 cm`.

## 5. Timeline
- Las mediciones existentes (weight, height, head_circumference) se siguen mostrando con el icono 📏
- El bubble de medición muestra todos los valores disponibles (peso kg, talla cm, CC cm)
- El detail page de medición muestra el formulario completo

## 6. Recursos
- Mover botón Recursos a la pantalla Perfil o como card secundaria en Análisis

## Backlog items de sesiones anteriores (para no perderlos)
- Tip/tranquilidad contextual cuando hay múltiples popós líquidas en poco tiempo.
- Custom themes vía AsyncStorage (ya implementado).
- Página de recursos con guía calmada (ya implementado).
