import React, { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, {
  Path, Line, Circle, Text as SvgText,
  Defs, LinearGradient, Stop, G,
} from "react-native-svg";
import {
  getReferenceCurves,
  calcPercentile,
  getMetricLabel,
  getMetricUnit,
  type BabyDataPoint,
} from "./percentiles";
import type { Sex, GrowthMetric } from "./whoData";

interface Props {
  sex: Sex;
  metric: GrowthMetric;
  babyData: BabyDataPoint[];
  color: string;
  height?: number;
  noData?: string;
}

const PAD_LEFT = 36;
const PAD_RIGHT = 8;
const PAD_TOP = 24;
const PAD_BOT = 32;
const VB_W = 320;

const CURVE_COLORS: Record<string, string> = {
  P3: "rgba(255,255,255,0.15)",
  P15: "rgba(255,255,255,0.22)",
  P50: "rgba(255,255,255,0.40)",
  P85: "rgba(255,255,255,0.22)",
  P97: "rgba(255,255,255,0.15)",
};

function smoothPath(
  pts: { x: number; y: number }[]
): string {
  if (!pts.length) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    const cx = (p.x + c.x) / 2;
    d.push(`C ${cx} ${p.y} ${cx} ${c.y} ${c.x} ${c.y}`);
  }
  return d.join(" ");
}

function formatMonth(m: number): string {
  if (m < 24) return `${m}m`;
  const y = Math.floor(m / 12);
  return `${y}a`;
}

export function GrowthPercentileChart({
  sex,
  metric,
  babyData,
  color,
  height = 240,
  noData = "Sin mediciones aún",
}: Props) {
  const refCurves = useMemo(() => getReferenceCurves(sex, metric), [sex, metric]);

  const allRefValues = useMemo(
    () => refCurves.flatMap((c) => c.points.map((p) => p.value)),
    [refCurves]
  );

  const babyValues = babyData.map((d) => d.value);
  const allValues = [...allRefValues, ...babyValues];

  const { minV, maxV, maxMonth } = useMemo(() => {
    if (!allValues.length) return { minV: 0, maxV: 100, maxMonth: 60 };
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const span = rawMax - rawMin || 1;
    const bm = babyData.length > 0 ? Math.max(...babyData.map((d) => d.ageMonths)) : 60;
    return {
      minV: Math.max(0, rawMin - span * 0.1),
      maxV: rawMax + span * 0.15,
      maxMonth: Math.max(60, Math.ceil(bm / 12) * 12 + 6),
    };
  }, [allValues, babyData]);

  const innerH = height - PAD_TOP - PAD_BOT;
  const innerW = VB_W - PAD_LEFT - PAD_RIGHT;

  const xOf = (month: number) =>
    PAD_LEFT + (month / maxMonth) * innerW;

  const yOf = (v: number) =>
    PAD_TOP + innerH - ((v - minV) / (maxV - minV)) * innerH;

  const baseY = PAD_TOP + innerH;

  const curves = useMemo(
    () =>
      refCurves.map((c) => ({
        ...c,
        svgPts: c.points.map((p) => ({
          x: xOf(p.month),
          y: yOf(p.value),
        })),
      })),
    [refCurves, minV, maxV, maxMonth]
  );

  const babySvgPts = useMemo(
    () =>
      babyData.map((d) => ({
        x: xOf(d.ageMonths),
        y: yOf(d.value),
        val: d.value,
        lbl: d.label,
      })),
    [babyData, minV, maxV, maxMonth]
  );

  const babyLine = smoothPath(babySvgPts);

  const yTicks = useMemo(() => {
    const lo = Math.min(...allValues);
    const hi = Math.max(...allValues);
    const mid = (lo + hi) / 2;
    return [lo, mid, hi].map((v) => Math.round(v * 100) / 100);
  }, [allValues]);

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let m = 0; m <= maxMonth; m += 6) ticks.push(m);
    return ticks;
  }, [maxMonth]);

  if (!babyData.length) {
    return (
      <View style={{ height, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 11, color: "#D1D5DB", fontWeight: "600" }}>
          {noData}
        </Text>
      </View>
    );
  }

  const gradId = `percentile_${metric}_${color.replace("#", "")}`;

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
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid horizontal */}
        {yTicks.map((v, i) => (
          <G key={`y-${i}`}>
            <Line
              x1={PAD_LEFT} y1={yOf(v)}
              x2={VB_W - PAD_RIGHT} y2={yOf(v)}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
            <SvgText
              x={PAD_LEFT - 4} y={yOf(v) + 3}
              textAnchor="end" fontSize="7.5" fill="#9CA3AF" fontWeight="600"
            >
              {v}
            </SvgText>
          </G>
        ))}

        {/* Grid vertical ticks */}
        {xTicks.map((m) => (
          <Line
            key={`x-${m}`}
            x1={xOf(m)} y1={PAD_TOP}
            x2={xOf(m)} y2={baseY}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
          />
        ))}

        {/* Eje X labels */}
        {xTicks.filter((m) => m % 12 === 0 || m === maxMonth).map((m) => (
          <SvgText
            key={`xl-${m}`}
            x={xOf(m)} y={height - 6}
            textAnchor="middle" fontSize="7.5" fill="#9CA3AF" fontWeight="600"
          >
            {formatMonth(m)}
          </SvgText>
        ))}

        {/* Baseline */}
        <Line
          x1={PAD_LEFT} y1={baseY}
          x2={VB_W - PAD_RIGHT} y2={baseY}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"
        />

        {/* Percentile curves (reference) */}
        {curves.map((c) => {
          const path = smoothPath(c.svgPts);
          return (
            <Path
              key={c.label}
              d={path}
              fill="none"
              stroke={CURVE_COLORS[c.label] ?? "rgba(255,255,255,0.15)"}
              strokeWidth="1"
              strokeDasharray="4,3"
            />
          );
        })}

        {/* Area bajo la línea del bebé */}
        {babySvgPts.length > 1 && (
          <Path
            d={`${babyLine} L ${babySvgPts[babySvgPts.length - 1].x} ${baseY} L ${babySvgPts[0].x} ${baseY} Z`}
            fill={`url(#${gradId})`}
          />
        )}

        {/* Baby data line */}
        {babyLine && (
          <Path
            d={babyLine}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Baby data points + percentile labels */}
        {babySvgPts.map((p, i) => {
          const pc = calcPercentile(sex, metric, babyData[i].ageMonths, p.val);
          return (
            <G key={i}>
              <Circle cx={p.x} cy={p.y} r={5} fill={color} opacity={0.2} />
              <Circle
                cx={p.x}
                cy={p.y}
                r={3}
                fill={color}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <SvgText
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                fontSize="8"
                fill={color}
                fontWeight="900"
              >
                {p.val.toFixed(1)}
              </SvgText>
              <SvgText
                x={p.x}
                y={p.y + 16}
                textAnchor="middle"
                fontSize="7"
                fill={color}
                fontWeight="700"
              >
                {pc.percentile.toFixed(0)}%
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 12,
          paddingTop: 4,
        }}
      >
        {curves.map((c) => (
          <View key={c.label} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View
              style={{
                width: 12,
                height: 2,
                backgroundColor: CURVE_COLORS[c.label],
                borderRadius: 1,
              }}
            />
            <Text style={{ fontSize: 8, color: "#9CA3AF", fontWeight: "600" }}>
              {c.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
