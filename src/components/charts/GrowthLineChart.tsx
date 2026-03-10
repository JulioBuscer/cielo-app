/**
 * GrowthLineChart.tsx — línea de crecimiento con puntos y etiquetas de valor.
 *
 * Muestra 1 serie a la vez: peso (kg), talla (cm) o cráneo (cm).
 * Diseñado para pocos puntos (2-30), los muestra todos con su label.
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Path, Line, Circle, Text as SvgText,
  Defs, LinearGradient, Stop, G,
} from 'react-native-svg';
import type { GrowthPoint } from '@/src/hooks/useChartData';

interface Props {
  points:   GrowthPoint[];
  field:    'weightKg' | 'heightCm' | 'headCircCm';
  color:    string;
  unit:     string;
  height?:  number;
  noData?:  string;
}

const PAD_LEFT  = 38;
const PAD_RIGHT = 12;
const PAD_TOP   = 28;   // espacio para labels de valor encima de puntos
const PAD_BOT   = 28;
const VB_W      = 320;

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const cx = (p.x + c.x) / 2;
    d.push(`C ${cx} ${p.y} ${cx} ${c.y} ${c.x} ${c.y}`);
  }
  return d.join(' ');
}

export function GrowthLineChart({ points, field, color, unit, height = 180, noData = 'Sin mediciones aún' }: Props) {
  const vals = points.map(p => p[field] as number | null).filter((v): v is number => v != null);
  const pts  = points.filter(p => p[field] != null);

  const innerH = height - PAD_TOP - PAD_BOT;
  const innerW = VB_W - PAD_LEFT - PAD_RIGHT;

  const { minV, maxV } = useMemo(() => {
    if (!vals.length) return { minV: 0, maxV: 1 };
    const raw_min = Math.min(...vals);
    const raw_max = Math.max(...vals);
    const span    = raw_max - raw_min || 1;
    return {
      minV: raw_min - span * 0.15,
      maxV: raw_max + span * 0.15,
    };
  }, [vals]);

  const xOf = (i: number) => pts.length > 1
    ? PAD_LEFT + (i / (pts.length - 1)) * innerW
    : PAD_LEFT + innerW / 2;

  const yOf = (v: number) =>
    PAD_TOP + innerH - ((v - minV) / (maxV - minV)) * innerH;

  const svgPts = pts.map((p, i) => ({
    x: xOf(i),
    y: yOf(p[field] as number),
    val: p[field] as number,
    lbl: p.label,
  }));

  const linePath  = smoothPath(svgPts);
  const baseY     = PAD_TOP + innerH;
  const areaPath  = svgPts.length > 1
    ? `${linePath} L ${svgPts[svgPts.length - 1].x} ${baseY} L ${svgPts[0].x} ${baseY} Z`
    : '';

  // Y ticks — 3 valores: min, mid, max
  const ticks = useMemo(() => {
    if (!vals.length) return [];
    const lo  = Math.min(...vals);
    const hi  = Math.max(...vals);
    const mid = (lo + hi) / 2;
    return [lo, mid, hi].map(v => Math.round(v * 100) / 100);
  }, [vals]);

  const gradId = `growth_${field}_${color.replace('#', '')}`;

  if (!pts.length) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: '#D1D5DB', fontWeight: '600' }}>{noData}</Text>
      </View>
    );
  }

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
            <Stop offset="0"   stopColor={color} stopOpacity="0.3" />
            <Stop offset="1"   stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Eje Y ticks + grid */}
        {ticks.map((v, i) => (
          <G key={i}>
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

        {/* Baseline */}
        <Line
          x1={PAD_LEFT} y1={baseY}
          x2={VB_W - PAD_RIGHT} y2={baseY}
          stroke="#E5E7EB" strokeWidth="1.5"
        />

        {/* Área rellena */}
        {areaPath && <Path d={areaPath} fill={`url(#${gradId})`} />}

        {/* Línea */}
        {linePath && (
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Puntos + valores + etiquetas de fecha */}
        {svgPts.map((p, i) => {
          const isFirst = i === 0;
          const isLast  = i === svgPts.length - 1;
          const showLbl = pts.length <= 8 || isFirst || isLast || i % Math.ceil(pts.length / 6) === 0;

          return (
            <G key={i}>
              {/* Punto exterior */}
              <Circle cx={p.x} cy={p.y} r={5} fill={color} opacity={0.2} />
              {/* Punto interior */}
              <Circle cx={p.x} cy={p.y} r={3} fill={color} stroke="#FFFFFF" strokeWidth="1.5" />

              {/* Valor encima del punto */}
              <SvgText
                x={p.x} y={p.y - 8}
                textAnchor="middle"
                fontSize="8.5" fill={color} fontWeight="900"
              >
                {field === 'weightKg' ? p.val.toFixed(3) : p.val.toFixed(1)}
              </SvgText>

              {/* Fecha debajo del eje */}
              {showLbl && (
                <SvgText
                  x={p.x} y={height - 4}
                  textAnchor="middle"
                  fontSize="7.5" fill="#9CA3AF" fontWeight="600"
                >
                  {p.lbl}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>

      {/* Unidad */}
      <View style={{ position: 'absolute', top: PAD_TOP - 10, left: 0 }}>
        <Text style={{ fontSize: 9, color, fontWeight: '900' }}>{unit}</Text>
      </View>
    </View>
  );
}
