/**
 * AreaChart.tsx — gráfica de área con gradiente SVG.
 *
 * Muestra una o dos series (ej: tomas + pañales) como áreas suaves.
 * Línea suave usando bezier curves.
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Path, Line, Text as SvgText, Circle,
  Defs, LinearGradient, Stop, G,
} from 'react-native-svg';

export interface AreaSeries {
  data:     number[];
  color:    string;
  label?:   string;
}

interface Props {
  series:    AreaSeries[];
  labels:    string[];        // etiquetas del eje X (puede incluir vacíos '')
  height?:   number;
  maxVal?:   number;
  noData?:   string;
  showDots?: boolean;
}

const PAD_LEFT  = 30;
const PAD_RIGHT = 10;
const PAD_TOP   = 14;
const PAD_BOT   = 24;
const VB_W      = 300;

// Genera path SVG suave (cubic bezier) para una serie de puntos
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  const cmd: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX  = (prev.x + curr.x) / 2;
    cmd.push(`C ${cpX} ${prev.y} ${cpX} ${curr.y} ${curr.x} ${curr.y}`);
  }
  return cmd.join(' ');
}

export function AreaChart({
  series,
  labels,
  height  = 150,
  maxVal,
  noData  = 'Sin datos aún',
  showDots = false,
}: Props) {
  const innerH = height - PAD_TOP - PAD_BOT;
  const innerW = VB_W - PAD_LEFT - PAD_RIGHT;
  const n      = labels.length;
  const step   = n > 1 ? innerW / (n - 1) : innerW;

  const max = useMemo(() => {
    if (maxVal != null) return maxVal;
    const m = Math.max(...series.flatMap(s => s.data), 1);
    if (m <= 5)  return 5;
    if (m <= 10) return 10;
    if (m <= 60) return Math.ceil(m / 10) * 10;
    if (m <= 120) return Math.ceil(m / 20) * 20;
    return Math.ceil(m / 30) * 30;
  }, [series, maxVal]);

  const yOf = (val: number) => PAD_TOP + innerH - Math.min(val / max, 1) * innerH;
  const xOf = (i: number)   => PAD_LEFT + i * step;

  const ticks = useMemo(() => {
    const step2 = max <= 10 ? Math.ceil(max / 4) : Math.ceil(max / 4 / 5) * 5 || 1;
    const arr: number[] = [0];
    for (let v = step2; v <= max; v += step2) arr.push(v);
    return arr;
  }, [max]);

  const allZero = series.every(s => s.data.every(v => v === 0));

  return (
    <View>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VB_W} ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {series.map((s, si) => {
            const gid = `area_grad_${si}_${s.color.replace('#', '')}`;
            return (
              <LinearGradient key={si} id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0"   stopColor={s.color} stopOpacity="0.35" />
                <Stop offset="1"   stopColor={s.color} stopOpacity="0.02" />
              </LinearGradient>
            );
          })}
        </Defs>

        {/* Grid + Y ticks */}
        {ticks.map(v => (
          <G key={v}>
            <Line
              x1={PAD_LEFT} y1={yOf(v)}
              x2={VB_W - PAD_RIGHT} y2={yOf(v)}
              stroke="#F3F4F6" strokeWidth="1"
            />
            <SvgText
              x={PAD_LEFT - 4} y={yOf(v) + 4}
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

        {/* Áreas y líneas (de atrás hacia adelante) */}
        {series.map((s, si) => {
          const points = s.data.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
          if (points.length < 2) return null;
          const gid     = `area_grad_${si}_${s.color.replace('#', '')}`;
          const linePath = smoothPath(points);

          // Área: bajamos a la baseline por los extremos
          const baseY = PAD_TOP + innerH;
          const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;

          return (
            <G key={si}>
              {/* Área con gradiente */}
              <Path d={areaPath} fill={`url(#${gid})`} />
              {/* Línea */}
              <Path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Puntos opcionales */}
              {showDots && points.map((p, i) => s.data[i] > 0 ? (
                <Circle
                  key={i}
                  cx={p.x} cy={p.y}
                  r={2.5}
                  fill={s.color}
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
              ) : null)}
            </G>
          );
        })}

        {/* Etiquetas X */}
        {labels.map((lbl, i) => lbl ? (
          <SvgText
            key={i}
            x={xOf(i)} y={height - 4}
            textAnchor="middle"
            fontSize="8" fill="#9CA3AF" fontWeight="600"
          >
            {lbl}
          </SvgText>
        ) : null)}
      </Svg>

      {/* Leyenda */}
      {series.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 }}>
          {series.map((s, i) => s.label ? (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: s.color }} />
              <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>{s.label}</Text>
            </View>
          ) : null)}
        </View>
      )}

      {allZero && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 11, color: '#D1D5DB', fontWeight: '600' }}>{noData}</Text>
        </View>
      )}
    </View>
  );
}
