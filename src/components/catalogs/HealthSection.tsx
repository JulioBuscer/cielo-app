import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { ZoneEditor } from "./ZoneEditor";
import type { Zone, HealthConfig } from "./types";

export function HealthSection({
  label,
  emoji,
  config,
  onChange,
}: {
  label: string;
  emoji: string;
  config: HealthConfig;
  onChange: (c: HealthConfig) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
          {emoji} {label}
        </Text>
        <TouchableOpacity
          onPress={() =>
            onChange({
              ...config,
              enabled: !config.enabled,
              zones: config.enabled ? config.zones : [],
            })
          }
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor: config.enabled ? c.success : c.elevated,
            padding: 3,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: c.textBody,
              alignSelf: config.enabled ? "flex-end" : "flex-start",
            }}
          />
        </TouchableOpacity>
      </View>

      {config.enabled && (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={String(config.min)}
                onChangeText={(v) =>
                  onChange({ ...config, min: v === '' ? 0 : parseInt(v) || 0 })
                }
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={c.textMuted}
                style={{
                  backgroundColor: c.card,
                  borderRadius: 8,
                  padding: 8,
                  color: c.textBody,
                  fontSize: 14,
                  textAlign: "center",
                }}
              />
            </View>
            <Text style={{ color: c.textMuted, alignSelf: "center" }}>→</Text>
            <View style={{ flex: 1 }}>
              <TextInput
                value={String(config.max)}
                onChangeText={(v) =>
                  onChange({ ...config, max: parseInt(v) || 8 })
                }
                keyboardType="number-pad"
                placeholder="8"
                placeholderTextColor={c.textMuted}
                style={{
                  backgroundColor: c.card,
                  borderRadius: 8,
                  padding: 8,
                  color: c.textBody,
                  fontSize: 14,
                  textAlign: "center",
                }}
              />
            </View>
          </View>
          <ZoneEditor
            zones={config.zones}
            onChange={(z) => onChange({ ...config, zones: z })}
            showEmoji
          />
        </>
      )}
    </View>
  );
}
