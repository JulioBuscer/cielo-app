import { View, Text, TextInput } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { ZoneEditor } from "./ZoneEditor";
import type { Zone, ConfigRange } from "./types";

export function IntensitySection({
  label,
  emoji,
  config,
  onChange,
}: {
  label: string;
  emoji: string;
  config: ConfigRange & { zones: Zone[] };
  onChange: (c: ConfigRange & { zones: Zone[] }) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 12 }}>
        {emoji} Rango de intensidad
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextInput
            value={String(config.min)}
            onChangeText={(v) => onChange({ ...config, min: parseInt(v) || 0 })}
            keyboardType="number-pad"
            placeholder="0"
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
            onChangeText={(v) => onChange({ ...config, max: parseInt(v) || 5 })}
            keyboardType="number-pad"
            placeholder="5"
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
      <ZoneEditor zones={config.zones} onChange={(z) => onChange({ ...config, zones: z })} />
    </View>
  );
}
