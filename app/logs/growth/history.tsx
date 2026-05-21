import { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import {
  useGrowthHistory,
  useLastGrowthLog,
  gramsToKg,
  mmToCm,
} from "@/src/hooks/useGrowthLogs";
import { BigButton } from "@/src/components/ui/BigButton";

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
  const { data: last } = useLastGrowthLog(baby?.id);

  const rows = useMemo(() => {
    if (!history) return [];
    return history.map((row, i) => {
      const prev = i < history.length - 1 ? history[i + 1] : null;
      return {
        ...row,
        weightLabel:
          row.weightGrams != null ? `${gramsToKg(row.weightGrams)} kg` : "-",
        weightDiff: diffLabel(
          row.weightGrams ?? null,
          prev?.weightGrams ?? null
        ),
        heightLabel:
          row.heightMm != null ? `${mmToCm(row.heightMm)} cm` : "-",
        heightDiff: diffLabel(
          row.heightMm ?? null,
          prev?.heightMm ?? null
        ),
        headLabel:
          row.headCircMm != null ? `${mmToCm(row.headCircMm)} cm` : "-",
        headDiff: diffLabel(
          row.headCircMm ?? null,
          prev?.headCircMm ?? null
        ),
        dateLabel: formatDate(row.timestamp),
      };
    });
  }, [history]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1A2E" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#1A1A2E",
          borderBottomWidth: 1,
          borderBottomColor: "#2A2A3E",
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "900",
            color: "#FFFFFF",
          }}
        >
          📊 Historial de Crecimiento
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Last measurements summary */}
      {last && (
        <View
          style={{
            backgroundColor: "#2A2A3E",
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            justifyContent: "space-around",
          }}
        >
          {last.weightGrams != null && (
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ color: "#888", fontSize: 11, fontWeight: "600" }}>
                Peso
              </Text>
              <Text style={{ color: "#FFD700", fontWeight: "800", fontSize: 16 }}>
                {gramsToKg(last.weightGrams)} kg
              </Text>
            </View>
          )}
          {last.heightMm != null && (
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ color: "#888", fontSize: 11, fontWeight: "600" }}>
                Talla
              </Text>
              <Text style={{ color: "#4CAF50", fontWeight: "800", fontSize: 16 }}>
                {mmToCm(last.heightMm)} cm
              </Text>
            </View>
          )}
          {last.headCircMm != null && (
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ color: "#888", fontSize: 11, fontWeight: "600" }}>
                C. Cefálico
              </Text>
              <Text style={{ color: "#9B59B6", fontWeight: "800", fontSize: 16 }}>
                {mmToCm(last.headCircMm)} cm
              </Text>
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={{ flex: 1, marginTop: 12 }}
        contentContainerStyle={{ padding: 16, gap: 0 }}
      >
        {/* Table header */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#2A2A3E",
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              flex: 2,
              color: "#888",
              fontWeight: "700",
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            Fecha
          </Text>
          <Text
            style={{
              flex: 2,
              color: "#FFD700",
              fontWeight: "700",
              fontSize: 11,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            Peso
          </Text>
          <Text
            style={{
              flex: 2,
              color: "#4CAF50",
              fontWeight: "700",
              fontSize: 11,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            Talla
          </Text>
          <Text
            style={{
              flex: 2,
              color: "#9B59B6",
              fontWeight: "700",
              fontSize: 11,
              textAlign: "right",
              textTransform: "uppercase",
            }}
          >
            Cefálico
          </Text>
        </View>

        {rows.length === 0 && (
          <View style={{ paddingVertical: 60, alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 40 }}>📏</Text>
            <Text style={{ color: "#888", fontWeight: "600", fontSize: 15, textAlign: "center" }}>
              Aún no hay registros de crecimiento
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/logs/growth/new")}
              style={{
                backgroundColor: "#FF8AB3",
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 99,
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>
                + Nuevo Registro
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {rows.map((row) => (
          <View
            key={row.id}
            style={{
              flexDirection: "row",
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#2A2A3E",
            }}
          >
            <Text
              style={{
                flex: 2,
                color: "#BBBBBB",
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              {row.dateLabel}
            </Text>
            <View style={{ flex: 2, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                {row.weightLabel}
              </Text>
              {row.weightDiff && (
                <Text
                  style={{
                    color: row.weightDiff.startsWith("+")
                      ? "#4CAF50"
                      : "#FF6B6B",
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  {row.weightDiff}
                </Text>
              )}
            </View>
            <View style={{ flex: 2, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                {row.heightLabel}
              </Text>
              {row.heightDiff && (
                <Text
                  style={{
                    color: row.heightDiff.startsWith("+")
                      ? "#4CAF50"
                      : "#FF6B6B",
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  {row.heightDiff}
                </Text>
              )}
            </View>
            <View style={{ flex: 2, alignItems: "flex-end" }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                {row.headLabel}
              </Text>
              {row.headDiff && (
                <Text
                  style={{
                    color: row.headDiff.startsWith("+")
                      ? "#4CAF50"
                      : "#FF6B6B",
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  {row.headDiff}
                </Text>
              )}
            </View>
          </View>
        ))}

        <View style={{ height: 24 }} />

        <BigButton
          title="➕ Nuevo Registro"
          onPress={() => router.push("/logs/growth/new")}
          variant="primary"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
