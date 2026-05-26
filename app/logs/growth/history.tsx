import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { useActiveBaby, calcAge } from "@/src/hooks/useBaby";
import { useGrowthHistory, gramsToKg, mmToCm } from "@/src/hooks/useGrowthLogs";
import { GrowthPercentileChart } from "@/src/growth/GrowthPercentileChart";
import { calcPercentile } from "@/src/growth/percentiles";
import type { GrowthMetric } from "@/src/growth/whoData";

function monthsBetween(birth: Date, ts: Date): number {
  const m = (ts.getFullYear() - birth.getFullYear()) * 12
    + (ts.getMonth() - birth.getMonth())
    + (ts.getDate() - birth.getDate()) / 30.44;
  return Math.max(0, Math.round(m * 10) / 10);
}

function formatDate(ts: Date | string | number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hour}:${min}`;
}

function diffLabel(current: number | null, prev: number | null): string | null {
  if (current == null || prev == null || prev === 0) return null;
  const diff = current - prev;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff}`;
}

const METRICS: { key: GrowthMetric; label: string; emoji: string; color: string }[] = [
  { key: "weight", label: "Peso", emoji: "⚖️", color: "#4CAF50" },
  { key: "height", label: "Talla", emoji: "📏", color: "#FF9800" },
  { key: "headCircumference", label: "CC", emoji: "📐", color: "#AB47BC" },
];

export default function GrowthHistoryScreen() {
  const { data: baby } = useActiveBaby();
  const { data: history } = useGrowthHistory(baby?.id);
  const { theme } = useTheme();
  const c = theme.colors;
  const [tab, setTab] = useState<"records" | "chart">("records");
  const [metric, setMetric] = useState<GrowthMetric>("weight");

  const rows = useMemo(() => {
    if (!history) return [];
    return history.map((row: any, i: number) => {
      const prev = i < history.length - 1 ? history[i + 1] : null;
      return {
        ...row,
        weightLabel: row.weightGrams != null ? `${gramsToKg(row.weightGrams)} kg` : "-",
        weightDiff: diffLabel(row.weightGrams ?? null, prev?.weightGrams ?? null),
        heightLabel: row.heightMm != null ? `${mmToCm(row.heightMm)} cm` : "-",
        heightDiff: diffLabel(row.heightMm ?? null, prev?.heightMm ?? null),
        headLabel: row.headCircMm != null ? `${mmToCm(row.headCircMm)} cm` : "-",
        headDiff: diffLabel(row.headCircMm ?? null, prev?.headCircMm ?? null),
        dateLabel: formatDate(row.timestamp),
      };
    });
  }, [history]);

  const birthDate = baby?.birthDate ? new Date(baby.birthDate) : null;
  const currentMetric = METRICS.find((m) => m.key === metric)!;

  const babyData = useMemo(() => {
    if (!history || !birthDate) return [];
    const pts: { label: string; ageMonths: number; value: number }[] = [];

    if (metric === "weight" && baby?.weightBirthGrams) {
      pts.push({ label: "Nac.", ageMonths: 0, value: baby.weightBirthGrams / 1000 });
    }
    if (metric === "height" && baby?.heightBirthMm) {
      pts.push({ label: "Nac.", ageMonths: 0, value: baby.heightBirthMm / 10 });
    }

    for (const log of history) {
      const ts = new Date(log.timestamp);
      const ageMonths = monthsBetween(birthDate, ts);
      let value: number | null = null;
      if (metric === "weight" && log.weightGrams) value = log.weightGrams / 1000;
      if (metric === "height" && log.heightMm) value = log.heightMm / 10;
      if (metric === "headCircumference" && log.headCircMm) value = log.headCircMm / 10;
      if (value !== null) {
        pts.push({
          label: ts.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
          ageMonths: Math.round(ageMonths * 10) / 10,
          value,
        });
      }
    }
    return pts.sort((a, b) => a.ageMonths - b.ageMonths);
  }, [history, birthDate, metric, baby]);

  const lastPoint = babyData[babyData.length - 1];
  const percentileInfo = useMemo(() => {
    if (!lastPoint || !baby?.sex || baby.sex === "unknown") return null;
    return calcPercentile(baby.sex as "male" | "female", metric, lastPoint.ageMonths, lastPoint.value);
  }, [lastPoint, baby?.sex, metric]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ fontSize: 24, color: c.textBody }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "900", color: c.textBody }}>📏 Mediciones</Text>
          <TouchableOpacity
            onPress={() => router.push("/logs/growth/new")}
            style={{
              backgroundColor: c.accent, paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 99, minHeight: 44, justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>➕ Nueva</Text>
          </TouchableOpacity>
        </View>

        {baby && (
          <Text style={{ fontSize: 13, fontWeight: "600", color: c.textMuted, marginTop: -8 }}>
            {baby.nickname || baby.name} · {calcAge(baby.birthDate).label}
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 6 }}>
          {[
            { key: "records" as const, label: "📋 Registros" },
            { key: "chart" as const, label: "📈 Curvas" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 99,
                backgroundColor: tab === t.key ? c.accent : c.card,
                alignItems: "center", borderWidth: 1,
                borderColor: tab === t.key ? c.accent : c.elevated,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: tab === t.key ? "#fff" : c.textBody }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === "chart" ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          {baby && baby.sex && baby.sex !== "unknown" ? (
            <>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {METRICS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setMetric(m.key)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 99,
                      backgroundColor: metric === m.key ? m.color : c.card,
                      alignItems: "center", borderWidth: 1,
                      borderColor: metric === m.key ? m.color : c.elevated,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: metric === m.key ? "#fff" : c.textBody }}>
                      {m.emoji} {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {percentileInfo && (
                <View style={{
                  backgroundColor: c.card, borderRadius: 16, padding: 16,
                  flexDirection: "row", justifyContent: "space-around",
                  borderWidth: 1, borderColor: c.elevated,
                }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 24, fontWeight: "900", color: currentMetric.color }}>
                      P{Math.round(percentileInfo.percentile)}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Percentil</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>
                      {lastPoint.value.toFixed(metric === "weight" ? 2 : 1)}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>
                      {metric === "weight" ? "kg" : "cm"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>
                      {lastPoint.ageMonths.toFixed(1)}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>meses</Text>
                  </View>
                </View>
              )}

              <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: c.elevated }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: currentMetric.color, marginBottom: 4 }}>
                  {currentMetric.emoji} {currentMetric.label} / Edad
                </Text>
                <GrowthPercentileChart
                  sex={baby.sex as "male" | "female"}
                  metric={metric}
                  babyData={babyData}
                  color={currentMetric.color}
                  height={260}
                />
              </View>

              {babyData.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: c.textBody }}>
                    Historial de {currentMetric.label.toLowerCase()}
                  </Text>
                  {babyData.slice().reverse().map((pt, i) => {
                    const p = baby.sex && baby.sex !== "unknown"
                      ? calcPercentile(baby.sex as "male" | "female", metric, pt.ageMonths, pt.value)
                      : null;
                    return (
                      <View key={i} style={{
                        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                        backgroundColor: c.card, borderRadius: 12, padding: 12,
                        borderWidth: 1, borderColor: c.elevated,
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody }}>{pt.label}</Text>
                          <Text style={{ fontSize: 11, color: c.textMuted }}>{pt.ageMonths.toFixed(1)} meses</Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>
                          {pt.value.toFixed(metric === "weight" ? 2 : 1)} {metric === "weight" ? "kg" : "cm"}
                        </Text>
                        {p && (
                          <Text style={{ fontSize: 13, fontWeight: "700", color: currentMetric.color, marginLeft: 8 }}>
                            P{Math.round(p.percentile)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={{ fontSize: 10, color: c.textMuted, textAlign: "center" }}>
                Basado en estándares OMS 2006 · P3/P15/P50/P85/P97
              </Text>
            </>
          ) : (
            <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: c.elevated }}>
              <Text style={{ fontSize: 32 }}>❓</Text>
              <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14, textAlign: "center" }}>
                Define el sexo del bebé en Perfil para ver curvas OMS
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 0 }}>
          <View style={{ flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: c.card, borderRadius: 12, marginBottom: 4 }}>
            <Text style={{ flex: 2, fontWeight: "700", fontSize: 11, color: c.textMuted, textTransform: "uppercase" }}>Fecha</Text>
            <Text style={{ flex: 2, fontWeight: "700", fontSize: 11, color: "#4CAF50", textAlign: "center", textTransform: "uppercase" }}>Peso</Text>
            <Text style={{ flex: 2, fontWeight: "700", fontSize: 11, color: "#FF9800", textAlign: "center", textTransform: "uppercase" }}>Talla</Text>
            <Text style={{ flex: 2, fontWeight: "700", fontSize: 11, color: "#AB47BC", textAlign: "right", textTransform: "uppercase" }}>CC</Text>
          </View>

          {rows.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 40 }}>📏</Text>
              <Text style={{ fontWeight: "600", fontSize: 15, color: c.textMuted, textAlign: "center" }}>
                Aún no hay registros de crecimiento
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/logs/growth/new")}
                style={{ backgroundColor: c.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99, minHeight: 44, justifyContent: "center", marginTop: 8 }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>+ Nuevo Registro</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rows.map((row: any) => (
              <View key={row.id} style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.elevated }}>
                <Text style={{ flex: 2, fontWeight: "600", fontSize: 11, color: c.textMuted }}>{row.dateLabel}</Text>
                <View style={{ flex: 2, alignItems: "center" }}>
                  <Text style={{ fontWeight: "700", fontSize: 12, color: c.textBody }}>{row.weightLabel}</Text>
                  {row.weightDiff && (
                    <Text style={{ color: row.weightDiff.startsWith("+") ? "#4CAF50" : "#FF6B6B", fontSize: 8, fontWeight: "600" }}>
                      {row.weightDiff}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 2, alignItems: "center" }}>
                  <Text style={{ fontWeight: "700", fontSize: 12, color: c.textBody }}>{row.heightLabel}</Text>
                  {row.heightDiff && (
                    <Text style={{ color: row.heightDiff.startsWith("+") ? "#4CAF50" : "#FF6B6B", fontSize: 8, fontWeight: "600" }}>
                      {row.heightDiff}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 2, alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "700", fontSize: 12, color: c.textBody }}>{row.headLabel}</Text>
                  {row.headDiff && (
                    <Text style={{ color: row.headDiff.startsWith("+") ? "#4CAF50" : "#FF6B6B", fontSize: 8, fontWeight: "600" }}>
                      {row.headDiff}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
