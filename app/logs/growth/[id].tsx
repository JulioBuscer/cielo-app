import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { useActiveBaby, calcAge } from "@/src/hooks/useBaby";
import { useGrowthHistory, gramsToKg, mmToCm } from "@/src/hooks/useGrowthLogs";
import { calcPercentile, getMetricLabel, getMetricUnit } from "@/src/growth/percentiles";
import { formatAgeMonths } from "@/src/utils/formatAgeMonths";
import { PercentileDetailModal } from "@/src/components/ui/PercentileDetailModal";
import type { GrowthMetric } from "@/src/growth/whoData";

function monthsBetween(birth: Date, ts: Date): number {
  const m = (ts.getFullYear() - birth.getFullYear()) * 12
    + (ts.getMonth() - birth.getMonth())
    + (ts.getDate() - birth.getDate()) / 30.44;
  return Math.max(0, Math.round(m * 10) / 10);
}

function formatTime(ts: Date | string | number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${min}`;
}

const METRICS: { key: GrowthMetric; label: string; emoji: string; color: string }[] = [
  { key: "weight", label: "Peso", emoji: "⚖️", color: "#4CAF50" },
  { key: "height", label: "Talla", emoji: "📏", color: "#FF9800" },
  { key: "headCircumference", label: "CC", emoji: "📐", color: "#AB47BC" },
];

export default function GrowthDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: baby } = useActiveBaby();
  const { data: history } = useGrowthHistory(baby?.id);
  const { theme } = useTheme();
  const c = theme.colors;
  const [detail, setDetail] = useState<{ ageMonths: number; value: number; metric: GrowthMetric } | null>(null);

  const record = useMemo(() => {
    if (!history) return null;
    return history.find((r: any) => r.id === id) ?? null;
  }, [history, id]);

  const birthDate = baby?.birthDate ? new Date(baby.birthDate) : null;

  if (!record) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
        <View style={{ padding: 24, gap: 16, alignItems: "center", paddingTop: 60 }}>
          <Text style={{ fontSize: 40 }}>📏</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.textMuted, textAlign: "center" }}>
            Registro no encontrado
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: c.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99, minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const measurements: { metric: GrowthMetric; value: number; unit: string; emoji: string; color: string }[] = [];
  if (record.weightGrams) {
    measurements.push({ metric: "weight", value: record.weightGrams / 1000, unit: "kg", emoji: "⚖️", color: "#4CAF50" });
  }
  if (record.heightMm) {
    measurements.push({ metric: "height", value: record.heightMm / 10, unit: "cm", emoji: "📏", color: "#FF9800" });
  }
  if (record.headCircMm) {
    measurements.push({ metric: "headCircumference", value: record.headCircMm / 10, unit: "cm", emoji: "📐", color: "#AB47BC" });
  }

  const ageMonths = birthDate ? monthsBetween(birthDate, new Date(record.timestamp)) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 16, gap: 16, paddingBottom: 8, alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24, color: c.textBody }}>‹ Volver</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.push({
            pathname: "/logs/growth/new",
            params: {
              editId: record.id,
              editWeightKg: record.weightGrams ? gramsToKg(record.weightGrams) : "",
              editHeightCm: record.heightMm ? mmToCm(record.heightMm) : "",
              editHeadCircCm: record.headCircMm ? mmToCm(record.headCircMm) : "",
              editTimestampMs: String(new Date(record.timestamp).getTime()),
              editNotes: record.notes ?? "",
              editSource: record.source ?? "timeline",
            },
          })}
          style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 22 }}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: c.textBody }}>📏 Medición</Text>

        {baby && (
          <Text style={{ fontSize: 13, fontWeight: "600", color: c.textMuted, marginTop: -12 }}>
            {baby.nickname || baby.name} · {formatTime(record.timestamp)} · {formatAgeMonths(ageMonths)}
          </Text>
        )}

        <View style={{ gap: 12 }}>
          {measurements.map((m) => {
            const result = baby?.sex && baby.sex !== "unknown"
              ? calcPercentile(baby.sex as "male" | "female", m.metric, ageMonths, m.value)
              : null;
            return (
              <TouchableOpacity
                key={m.metric}
                onPress={() => setDetail({ ageMonths, value: m.value, metric: m.metric })}
                style={{
                  backgroundColor: c.card, borderRadius: 16, padding: 16,
                  flexDirection: "row", alignItems: "center", gap: 12,
                  borderWidth: 1, borderColor: c.elevated,
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: m.color + "20", alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.textBody }}>
                    {getMetricLabel(m.metric)}
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: m.color }}>
                    {m.value.toFixed(m.metric === "weight" ? 2 : 1)} {m.unit}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {result && (
                    <>
                      <Text style={{ fontSize: 18, fontWeight: "900", color: m.color }}>
                        P{Math.round(result.percentile)}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: c.textBody }}>
                        z = {result.z.toFixed(2)}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {record.notes && (
          <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.elevated }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, textTransform: "uppercase" }}>Notas</Text>
            <Text style={{ fontSize: 14, color: c.textBody, marginTop: 4 }}>{record.notes}</Text>
          </View>
        )}

        <Text style={{ fontSize: 10, color: c.textMuted, textAlign: "center" }}>
          Basado en estándares OMS 2006 · Toca cualquier medición para ver el detalle del cálculo
        </Text>
      </ScrollView>

      {detail && baby?.sex && baby.sex !== "unknown" && (
        <PercentileDetailModal
          visible
          onClose={() => setDetail(null)}
          sex={baby.sex as "male" | "female"}
          metric={detail.metric}
          ageMonths={detail.ageMonths}
          value={detail.value}
        />
      )}
    </SafeAreaView>
  );
}
