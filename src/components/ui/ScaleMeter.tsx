import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import type { ObservationMetric } from "@/src/db/schema";

export function ScaleMeter({
  value,
  onChange,
  min,
  max,
  zones,
  emoji,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  zones: { min: number; max: number; color: string; label: string; emoji?: string }[];
  emoji: string;
  label?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const zoneFor = (n: number) => zones.find((z) => n >= z.min && n <= z.max);

  return (
    <View style={{ gap: 4 }}>
      {label && (
        <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 12 }}>
          {label}
        </Text>
      )}
      <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
        {steps.map((n) => {
          const active = n === value;
          const z = zoneFor(n);
          const bgColor = active && z ? z.color : c.card;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: bgColor,
                opacity: active ? 1 : 0.35,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 0 : 1,
                borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 14 }}>{z?.emoji ?? emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value > 0 && zoneFor(value) && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {zoneFor(value)?.emoji ? (
            <Text style={{ fontSize: 14 }}>{zoneFor(value)?.emoji}</Text>
          ) : null}
          <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 11 }}>
            {zoneFor(value)?.label}
          </Text>
        </View>
      )}
    </View>
  );
}

export function MetricSlider({
  metric,
  value,
  onChange,
}: {
  metric: ObservationMetric;
  value: number;
  onChange: (v: number) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const steps = Array.from({ length: metric.scaleMax - metric.scaleMin + 1 }, (_, i) => metric.scaleMin + i);
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11 }}>
        {metric.name}
      </Text>
      <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
        {steps.map((n) => {
          const active = n === value;
          const z = metric.zones.find((z) => n >= z.min && n <= z.max);
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: active && z ? z.color : c.card,
                opacity: active ? 1 : 0.35,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 0 : 1,
                borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 12 }}>{z?.emoji ?? ""}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value > 0 && (() => {
        const z = metric.zones.find((z) => value >= z.min && value <= z.max);
        if (!z) return null;
        return (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {z.emoji ? <Text style={{ fontSize: 12 }}>{z.emoji}</Text> : null}
              <Text style={{ color: z.color, fontWeight: "700", fontSize: 11 }}>{z.label}</Text>
            </View>
            {z.note && (
              <ZoneNote zone={z} />
            )}
          </>
        );
      })()}
    </View>
  );
}

export function ZoneNote({ zone }: { zone?: { note?: string; isAlert?: boolean } | null }) {
  const { theme } = useTheme();
  if (!zone?.note) return null;
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: zone.isAlert ? theme.colors.danger + "12" : theme.colors.warning + "15",
      borderRadius: 10,
      padding: 8,
    }}>
      <Text style={{ fontSize: 14 }}>{zone.isAlert ? "🚨" : "ℹ️"}</Text>
      <Text style={{ flex: 1, fontSize: 11, fontWeight: "600", color: theme.colors.textBody, lineHeight: 16 }}>
        {zone.note}
      </Text>
    </View>
  );
}
