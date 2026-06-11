import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby, calcAge, STATUS_LABELS } from "@/src/hooks/useBaby";
import { useTheme } from "@/src/theme/useTheme";
import { StatsSection } from "@/src/components/analisis/StatsSection";
import { HistorySection } from "@/src/components/analisis/HistorySection";

const TABS = [
  { key: "stats" as const, emoji: "📈", label: "Stats" },
  { key: "historial" as const, emoji: "📋", label: "Historial" },
];

export default function AnalisisScreen() {
  const { theme } = useTheme();
  const { data: baby } = useActiveBaby();
  const [tab, setTab] = useState<"stats" | "historial">("stats");
  const c = theme.colors;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>
          📊 Análisis
        </Text>
        {baby && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 18 }}>{baby.avatarEmoji ?? "👶"}</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.textMuted }}>
              {baby.nickname || baby.name}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}>
              {calcAge(baby.birthDate).label}
              {baby.status ? ` · ${STATUS_LABELS[baby.status]?.emoji ?? ""}` : ""}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: c.card, borderRadius: 12, padding: 3 }}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{
              flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10,
              backgroundColor: tab === t.key ? c.accent : "transparent",
              flexDirection: "row", justifyContent: "center", gap: 4,
            }}
          >
            <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: tab === t.key ? "#fff" : c.textMuted }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "stats" ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {baby && <StatsSection babyId={baby.id} />}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {baby && <HistorySection babyId={baby.id} />}
        </View>
      )}
    </SafeAreaView>
  );
}
