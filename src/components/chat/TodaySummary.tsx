import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useChatSummary } from "@/src/hooks/useChatSummary";

export function TodaySummary({ babyId }: { babyId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;
  const summary = useChatSummary(babyId);

  const items: { emoji: string; label: string; count: number }[] = [
    { emoji: "🍼", label: "Tomas", count: summary.feedingCount },
    { emoji: "😴", label: "Siestas", count: summary.sleepCount },
    { emoji: "🍑", label: "Pañales", count: summary.diaperCount },
    { emoji: "🥦", label: "Comidas", count: summary.foodCount },
  ];

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 4,
        borderRadius: 14,
        backgroundColor: c.surface + "CC",
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded((s) => !s)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 10,
          minHeight: 40,
        }}
      >
        <Text style={{ fontSize: 14, marginRight: 8 }}>📋</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: "700",
            color: c.textBody,
          }}
        >
          Resumen de Hoy
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {items
            .filter((it) => it.count > 0)
            .slice(0, 3)
            .map((it) => (
              <View
                key={it.label}
                style={{
                  backgroundColor: c.accent + "20",
                  borderRadius: 99,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 11 }}>{it.emoji}</Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: c.accentStrong,
                  }}
                >
                  {it.count}
                </Text>
              </View>
            ))}
          <Text style={{ fontSize: 12, color: c.textMuted }}>
            {expanded ? "▲" : "▼"}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            paddingHorizontal: 14,
            paddingBottom: 10,
          }}
        >
          {items.map((it) => (
            <View
              key={it.label}
              style={{
                backgroundColor: c.card,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                minWidth: 80,
              }}
            >
              <Text style={{ fontSize: 16 }}>{it.emoji}</Text>
              <View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    color: c.textMuted,
                  }}
                >
                  {it.label}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: c.textBody,
                  }}
                >
                  {it.count}
                </Text>
              </View>
            </View>
          ))}
          {summary.totalSleepMinutes > 0 && (
            <View
              style={{
                backgroundColor: c.card,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 16 }}>💤</Text>
              <View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    color: c.textMuted,
                  }}
                >
                  Sueño total
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: c.textBody,
                  }}
                >
                  {Math.floor(summary.totalSleepMinutes / 60)}h{" "}
                  {summary.totalSleepMinutes % 60}m
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
