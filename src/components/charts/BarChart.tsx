/**
 * BarChart.tsx — gráfica de barras verticales con SVG.
 *
 * Props:
 *   data     — array de { label, value }
 *   color    — color de las barras
 *   height   — alto del área del chart (sin ejes)
 *   showAvg  — dibuja línea de promedio
 *   unit     — unidad para el tooltip ("tomas", "min", etc.)
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Rect, Line, Text as SvgText,
  Defs, LinearGradient, Stop, G,
} from 'react-native-svg';

export interface BarData {
  label: string;
  value: number;
}

interface Props {
  data:      BarData[];
  color?:    string;
  height?:   number;
  showAvg?:  boolean;
  unit?:     string;
  maxVal?:   number;         // forzar escala manual
  noData?:   string;        // texto cuando todos son 0
}

const PAD_LEFT  = 28;
const PAD_RIGHT = 8;
const PAD_TOP   = 12;
const PAD_BOT   = 24;

export function BarChart({
  data,
  color   = '#FF5C9A',
  height  = 140,
  showAvg = false,
  unit    = '',
  maxVal,
  noData  = 'Sin datos aún',
}: Props) {
  const innerH = height - PAD_TOP - PAD_BOT;

  const max = useMemo(() => {
    if (maxVal != null) return maxVal;
    const m = Math.max(...data.map(d => d.value), 1);
    // Round up to nice number
    if (m <= 5)  return 5;
    if (m <= 10) return 10;
    if (m <= 20) return Math.ceil(m / 5) * 5;
    return Math.ceil(m / 10) * 10;
  }, [data, maxVal]);

  const avg = useMemo(() => {
    const nonZero = data.filter(d => d.value > 0);
    if (!nonZero.length) return 0;
    return nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length;
  }, [data]);

  const allZero = data.every(d => d.value === 0);

  // SVG width viene de onLayout, pero usamos un valor "relativo" y lo escalamos
  // con viewBox. Esto hace el chart responsive.
  const VB_W     = 300;
  const innerW   = VB_W - PAD_LEFT - PAD_RIGHT;
  const barW     = Math.max(2, innerW / data.length - 2);
  const barStep  = innerW / data.length;

  const yTick = (val: number) => PAD_TOP + innerH - (val / max) * innerH;
  const xBar  = (i: number)   => PAD_LEFT + i * barStep + (barStep - barW) / 2;

  // Eje Y: 3-4 ticks
  const ticks = useMemo(() => {
    const step = max <= 10 ? Math.ceil(max / 4) : Math.ceil(max / 4 / 5) * 5;
    const arr: number[] = [0];
    for (let v = step; v <= max; v += step) arr.push(v);
    return arr;
  }, [max]);

  const gradId = `bar_grad_${color.replace('#', '')}`;

  return (
    <View>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VB_W} ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={color} stopOpacity="1"   />
            <Stop offset="1"   stopColor={color} stopOpacity="0.55"/>
          </LinearGradient>
        </Defs>

        {/* Grid lines + Y ticks */}
        {ticks.map(v => (
          <G key={v}>
            <Line
              x1={PAD_LEFT} y1={yTick(v)}
              x2={VB_W - PAD_RIGHT} y2={yTick(v)}
              stroke="#F3F4F6" strokeWidth="1"
            />
            <SvgText
              x={PAD_LEFT - 4} y={yTick(v) + 4}
              textAnchor="end"
              fontSize="8" fill="#9CA3AF" fontWeight="600"
            >
              {v}
            </SvgText>
          </G>
        ))}

        {/* Línea base */}
        <Line
          x1={PAD_LEFT} y1={PAD_TOP + innerH}
          x2={VB_W - PAD_RIGHT} y2={PAD_TOP + innerH}
          stroke="#E5E7EB" strokeWidth="1.5"
        />

        {/* Barras */}
        {data.map((d, i) => {
          const bH  = Math.max(0, (d.value / max) * innerH);
          const bX  = xBar(i);
          const bY  = PAD_TOP + innerH - bH;
          const r   = Math.min(3, barW / 2);
          return (
            <G key={i}>
              {/* Barra con radio arriba */}
              <Rect
                x={bX} y={bY}
                width={barW} height={bH}
                fill={bH > 0 ? `url(#${gradId})` : 'transparent'}
                rx={r} ry={r}
              />
              {/* Valor encima si hay espacio */}
              {d.value > 0 && barW >= 10 && bH > 14 && (
                <SvgText
                  x={bX + barW / 2} y={bY + 9}
                  textAnchor="middle"
                  fontSize="7" fill="#FFFFFF" fontWeight="900"
                >
                  {d.value}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* Línea de promedio */}
        {showAvg && avg > 0 && (
          <G>
            <Line
              x1={PAD_LEFT} y1={yTick(avg)}
              x2={VB_W - PAD_RIGHT} y2={yTick(avg)}
              stroke={color} strokeWidth="1"
              strokeDasharray="4 3"
              strokeOpacity="0.7"
            />
            <SvgText
              x={VB_W - PAD_RIGHT + 2} y={yTick(avg) + 4}
              fontSize="7" fill={color} fontWeight="800"
            >
              ⌀
            </SvgText>
          </G>
        )}

        {/* Etiquetas X */}
        {data.map((d, i) => d.label ? (
          <SvgText
            key={i}
            x={xBar(i) + barW / 2} y={height - 4}
            textAnchor="middle"
            fontSize="8" fill="#9CA3AF" fontWeight="600"
          >
            {d.label}
          </SvgText>
        ) : null)}
      </Svg>

      {/* No data overlay */}
      {allZero && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 11, color: '#D1D5DB', fontWeight: '600' }}>
            {noData}
          </Text>
        </View>
      )}
    </View>
  );
}
