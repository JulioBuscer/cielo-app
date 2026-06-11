import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useStats, getRangeBounds, type RangeType } from "@/src/hooks/useStats";
import { useChartData } from "@/src/hooks/useChartData";
import { BarChart } from "@/src/components/charts/BarChart";
import { AreaChart } from "@/src/components/charts/AreaChart";
import { GrowthLineChart } from "@/src/components/charts/GrowthLineChart";
import { useTheme } from "@/src/theme/useTheme";

const RANGES: { key: RangeType; label: string; icon: string }[] = [
  { key: "day", label: "Día", icon: "☀️" },
  { key: "week", label: "Semana", icon: "📅" },
  { key: "month", label: "Mes", icon: "🗓️" },
  { key: "year", label: "Año", icon: "📆" },
];

function shiftDate(d: Date, range: RangeType, dir: -1 | 1): Date {
  const n = new Date(d);
  if (range === "day") n.setDate(n.getDate() + dir);
  if (range === "week") n.setDate(n.getDate() + dir * 7);
  if (range === "month") n.setMonth(n.getMonth() + dir);
  if (range === "year") n.setFullYear(n.getFullYear() + dir);
  return n;
}

export function StatsSection({ babyId }: { babyId?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [range, setRange] = useState<RangeType>("week");
  const [refDate, setRefDate] = useState(() => new Date());
  const [growthMetric, setGrowthMetric] = useState<"weightKg" | "heightCm" | "headCircCm">("weightKg");

  const { data: result, isLoading } = useStats(babyId, range, refDate);
  const { data: chartData, isLoading: chartLoading } = useChartData(babyId, range, refDate);

  const curr = result?.current;
  const prev = result?.previous;

  const isCurrentPeriod = useMemo(() => {
    const todayBounds = getRangeBounds(range, new Date());
    const refBounds = getRangeBounds(range, refDate);
    return refBounds.start.getTime() === todayBounds.start.getTime();
  }, [range, refDate]);

  const feedBars = chartData?.buckets.map((b) => ({ label: b.label, value: b.feeding })) ?? [];
  const diaperBars = chartData?.buckets.map((b) => ({ label: b.label, value: b.diaper })) ?? [];
  const sleepArea = chartData?.buckets.map((b) => b.sleep) ?? [];
  const feedArea = chartData?.buckets.map((b) => b.feeding) ?? [];
  const diaperArea = chartData?.buckets.map((b) => b.diaper) ?? [];
  const xLabels = chartData?.buckets.map((b) => b.label) ?? [];

  const chartTitle: Record<RangeType, string> = {
    day: "Por hora (hoy)",
    week: "Por día (esta semana)",
    month: "Por día (este mes)",
    year: "Por mes (este año)",
  };

  const growthPts = growthMetric === "weightKg"
    ? (chartData?.weightHistory ?? [])
    : growthMetric === "heightCm"
      ? (chartData?.heightHistory ?? [])
      : (chartData?.headHistory ?? []);

  return (
    <View style={{ gap: 12, paddingBottom: 32 }}>
      {/* Range tabs */}
      <View style={{ flexDirection: "row", backgroundColor: c.card, borderRadius: 12, padding: 3 }}>
        {RANGES.map((r) => {
          const active = r.key === range;
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => { setRange(r.key); setRefDate(new Date()); }}
              style={{
                flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 10,
                backgroundColor: active ? c.accent : "transparent",
                flexDirection: "row", justifyContent: "center", gap: 4,
              }}
            >
              <Text style={{ fontSize: 12 }}>{r.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: "800", color: active ? "#fff" : c.textMuted }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date nav */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TouchableOpacity onPress={() => setRefDate(shiftDate(refDate, range, -1))} style={{ padding: 8 }}>
          <Text style={{ fontSize: 20, color: c.textMuted }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontWeight: "700", fontSize: 13, color: c.textBody }}>{result?.rangeLabel ?? "…"}</Text>
          {!isCurrentPeriod && (
            <TouchableOpacity onPress={() => setRefDate(new Date())}>
              <Text style={{ fontSize: 11, color: c.accent, fontWeight: "700" }}>Ir al actual →</Text>
            </TouchableOpacity>
          )}
          {isCurrentPeriod && (
            <Text style={{ fontSize: 10, color: c.textMuted }}>Período actual</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => !isCurrentPeriod && setRefDate(shiftDate(refDate, range, 1))}
          disabled={isCurrentPeriod}
          style={{ padding: 8, opacity: isCurrentPeriod ? 0.3 : 1 }}
        >
          <Text style={{ fontSize: 20, color: c.textMuted }}>›</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.accent} style={{ padding: 32 }} />
      ) : !curr || !prev ? (
        <Text style={{ color: c.textMuted, textAlign: "center", padding: 24 }}>
          Sin datos en este período
        </Text>
      ) : (
        <>
          {/* Summary cards */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { emoji: "🍼", label: "Tomas", value: `${curr.feedingCount}`, color: c.accentStrong },
              { emoji: "😴", label: "Sueño", value: `${curr.sleepCount}`, color: "#818CF8" },
              { emoji: "🍑", label: "Pañales", value: `${curr.diaperCount}`, color: "#F59E0B" },
            ].map((card) => (
              <View key={card.label} style={{
                flex: 1, backgroundColor: c.card, borderRadius: 14, padding: 12,
                borderTopWidth: 3, borderTopColor: card.color,
              }}>
                <Text style={{ fontSize: 18 }}>{card.emoji}</Text>
                <Text style={{ fontSize: 18, fontWeight: "900", color: c.textBody }}>{card.value}</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: c.textMuted }}>{card.label}</Text>
              </View>
            ))}
          </View>

          {/* Charts */}
          {chartLoading ? (
            <ActivityIndicator color={c.accent} />
          ) : chartData ? (
            <View style={{ gap: 12 }}>
              {/* Feeding chart */}
              <View style={{
                backgroundColor: c.card, borderRadius: 14, padding: 12,
                borderTopWidth: 3, borderTopColor: c.accentStrong,
              }}>
                <Text style={{ fontWeight: "900", fontSize: 13, color: c.textBody, marginBottom: 8 }}>
                  🍼 Tomas · {chartTitle[range]}
                </Text>
                <BarChart data={feedBars} color={c.accentStrong} height={120} showAvg unit="tomas" noData="Sin tomas" />
              </View>

              {/* Sleep + diaper chart */}
              <View style={{
                backgroundColor: c.card, borderRadius: 14, padding: 12,
                borderTopWidth: 3, borderTopColor: "#818CF8",
              }}>
                <Text style={{ fontWeight: "900", fontSize: 13, color: c.textBody, marginBottom: 8 }}>
                  😴 Sueño · 🍑 Pañales · {chartTitle[range]}
                </Text>
                <AreaChart
                  series={[
                    { data: sleepArea, color: "#818CF8", label: "Sueño" },
                    { data: diaperArea, color: "#F59E0B", label: "Pañales" },
                  ]}
                  labels={xLabels}
                  height={120}
                  showDots={range === "week"}
                  noData="Sin datos"
                />
              </View>

              {/* Growth chart */}
              {chartData.hasGrowth && (
                <View style={{
                  backgroundColor: c.card, borderRadius: 14, padding: 12,
                  borderTopWidth: 3, borderTopColor: c.success,
                }}>
                  <Text style={{ fontWeight: "900", fontSize: 13, color: c.textBody, marginBottom: 8 }}>
                    📈 Crecimiento
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                    {([
                      { key: "weightKg" as const, label: "⚖️ Peso", color: c.success },
                      { key: "heightCm" as const, label: "📏 Talla", color: "#3B82F6" },
                      { key: "headCircCm" as const, label: "🔵 Cráneo", color: "#8B5CF6" },
                    ]).map((m) => {
                      const hasPts = m.key === "weightKg"
                        ? (chartData.weightHistory?.length ?? 0) > 0
                        : m.key === "heightCm"
                          ? (chartData.heightHistory?.length ?? 0) > 0
                          : (chartData.headHistory?.length ?? 0) > 0;
                      if (!hasPts) return null;
                      return (
                        <TouchableOpacity
                          key={m.key}
                          onPress={() => setGrowthMetric(m.key)}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
                            backgroundColor: growthMetric === m.key ? m.color + "30" : c.surface,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "800", color: growthMetric === m.key ? m.color : c.textMuted }}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <GrowthLineChart points={growthPts} field={growthMetric} color={growthMetric === "weightKg" ? c.success : growthMetric === "heightCm" ? "#3B82F6" : "#8B5CF6"} unit={growthMetric === "weightKg" ? "kg" : "cm"} height={160} noData="Sin datos" />
                </View>
              )}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
