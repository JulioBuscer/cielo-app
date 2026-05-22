import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { useActiveBaby } from "@/src/hooks/useBaby";
import {
  useGrowthHistory,
  gramsToKg,
  mmToCm,
} from "@/src/hooks/useGrowthLogs";
import { GrowthPercentileChart } from "@/src/growth/GrowthPercentileChart";
import type { GrowthMetric } from "@/src/growth/whoData";

function monthsBetween(birth: Date, ts: Date): number {
  const m = (ts.getFullYear() - birth.getFullYear()) * 12
    + (ts.getMonth() - birth.getMonth())
    + (ts.getDate() - birth.getDate()) / 30.44;
  return Math.max(0, Math.round(m * 10) / 10);
}

type GrowthRow = {
  timestamp: Date;
  weightGrams: number | null;
  heightMm: number | null;
  headCircMm: number | null;
};

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

export default function GrowthHistoryScreen() {
  const { data: baby } = useActiveBaby();
  const { data: history } = useGrowthHistory(baby?.id);
  const { theme } = useTheme();
  const c = theme.colors;
  const [tab, setTab] = useState<"records" | "chart">("records");

  const rows = useMemo(() => {
    if (!history) return [];
    return history.map((row, i) => {
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

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: c.surface, borderBottomColor: c.elevated }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-black" style={{ color: c.textBody }}>
          📊 Historial
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/logs/growth/new")}
          style={{
            backgroundColor: c.accent,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 99,
            minHeight: 44,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>➕ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs: Registros | Curva OMS */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 12,
          overflow: "hidden",
          alignSelf: "center",
        }}
      >
        {[
          { key: "records" as const, label: "📋 Registros" },
          { key: "chart" as const, label: "📈 Curva OMS" },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                backgroundColor: active ? c.accent : c.card,
                minHeight: 44,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: active ? "#FFFFFF" : c.textMuted,
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === "chart" && baby && history && history.length > 0 && (baby.sex === "male" || baby.sex === "female") && (
        <ScrollView style={{ flex: 1, marginTop: 8 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text className="font-black text-sm" style={{ color: c.textBody }}>
            📈 Curva de Crecimiento (OMS)
          </Text>
          {(() => {
            const birthDate = new Date(baby.birthDate);
            const rows = history as GrowthRow[];
            const metricConfigs: { key: GrowthMetric; color: string; val: (r: GrowthRow) => number | null }[] = [
              { key: "weight", color: "#FFD700", val: (r) => r.weightGrams != null ? r.weightGrams / 1000 : null },
              { key: "height", color: "#4CAF50", val: (r) => r.heightMm != null ? r.heightMm / 10 : null },
              { key: "headCircumference", color: "#9B59B6", val: (r) => r.headCircMm != null ? r.headCircMm / 10 : null },
            ];
            return metricConfigs.map(({ key, color, val }) => {
              const pts = rows
                .map((r) => ({ ts: new Date(r.timestamp), value: val(r) }))
                .filter((p): p is { ts: Date; value: number } => p.value != null)
                .reverse()
                .map((p) => ({
                  label: p.ts.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
                  ageMonths: monthsBetween(birthDate, p.ts),
                  value: p.value,
                }));
              if (pts.length < 1) return null;
              return (
                <View key={key} style={{ backgroundColor: c.card, borderRadius: 12, padding: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ color, fontWeight: "800", fontSize: 12 }}>
                      {key === "weight" ? "⚖️ Peso" : key === "height" ? "📏 Talla" : "🧠 C. Cefálico"}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 10 }}>{pts.length} registros</Text>
                  </View>
                  <GrowthPercentileChart
                    sex={baby.sex as "male" | "female"}
                    metric={key}
                    babyData={pts}
                    color={color}
                    height={200}
                  />
                </View>
              );
            });
          })()}
        </ScrollView>
      )}

      {tab === "records" && (
        <ScrollView style={{ flex: 1, marginTop: 8 }} contentContainerStyle={{ padding: 16, gap: 0 }}>
          {/* Table header */}
          <View className="rounded-xl py-2.5 px-3 mb-1 flex-row" style={{ backgroundColor: c.card }}>
            <Text className="flex-[2] font-bold text-[11px] uppercase" style={{ color: c.textDim }}>Fecha</Text>
            <Text className="flex-[2] font-bold text-[11px] text-center uppercase" style={{ color: "#FFD700" }}>Peso</Text>
            <Text className="flex-[2] font-bold text-[11px] text-center uppercase" style={{ color: "#4CAF50" }}>Talla</Text>
            <Text className="flex-[2] font-bold text-[11px] text-right uppercase" style={{ color: "#9B59B6" }}>Cefálico</Text>
          </View>

          {rows.length === 0 && (
            <View style={{ paddingVertical: 60, alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 40 }}>📏</Text>
              <Text className="font-semibold text-[15px] text-center" style={{ color: c.textDim }}>
                Aún no hay registros de crecimiento
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/logs/growth/new")}
                className="rounded-full px-5 py-2.5 mt-2" style={{ backgroundColor: c.accent }}
              >
                <Text className="font-black text-sm" style={{ color: '#FFFFFF' }}>+ Nuevo Registro</Text>
              </TouchableOpacity>
            </View>
          )}

          {rows.map((row) => (
            <View
              key={row.id}
              style={{
                flexDirection: "row",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderBottomWidth: 1,
                borderBottomColor: c.elevated,
              }}
            >
              <Text className="flex-[2] font-semibold text-[11px]" style={{ color: c.textMuted }}>{row.dateLabel}</Text>
              <View style={{ flex: 2, alignItems: "center" }}>
                <Text className="font-bold text-xs" style={{ color: c.textBody }}>{row.weightLabel}</Text>
                {row.weightDiff && (
                  <Text style={{ color: row.weightDiff.startsWith("+") ? "#4CAF50" : "#FF6B6B", fontSize: 8, fontWeight: "600" }}>
                    {row.weightDiff}
                  </Text>
                )}
              </View>
              <View style={{ flex: 2, alignItems: "center" }}>
                <Text className="font-bold text-xs" style={{ color: c.textBody }}>{row.heightLabel}</Text>
                {row.heightDiff && (
                  <Text style={{ color: row.heightDiff.startsWith("+") ? "#4CAF50" : "#FF6B6B", fontSize: 8, fontWeight: "600" }}>
                    {row.heightDiff}
                  </Text>
                )}
              </View>
              <View style={{ flex: 2, alignItems: "flex-end" }}>
                <Text className="font-bold text-xs" style={{ color: c.textBody }}>{row.headLabel}</Text>
                {row.headDiff && (
                  <Text style={{ color: row.headDiff.startsWith("+") ? "#4CAF50" : "#FF6B6B", fontSize: 8, fontWeight: "600" }}>
                    {row.headDiff}
                  </Text>
                )}
              </View>
            </View>
          ))}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
