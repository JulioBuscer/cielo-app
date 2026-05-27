import { View, Text } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { IntensitySection } from "./IntensitySection";
import { HealthSection } from "./HealthSection";
import type { Zone, ConfigRange, HealthConfig } from "./types";

export function PoopConfigSection({
  intensity,
  setIntensity,
  health,
  setHealth,
  consistency,
  setConsistency,
}: {
  intensity: ConfigRange & { zones: Zone[] };
  setIntensity: (c: ConfigRange & { zones: Zone[] }) => void;
  health: HealthConfig;
  setHealth: (c: HealthConfig) => void;
  consistency: ConfigRange & { zones: Zone[] };
  setConsistency: (c: ConfigRange & { zones: Zone[] }) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        backgroundColor: c.card,
        borderRadius: 20,
        padding: 16,
        gap: 16,
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 15, color: c.textBody }}>
        💩 Popó
      </Text>
      <IntensitySection
        label="Intensidad"
        emoji="💩"
        config={intensity}
        onChange={setIntensity}
      />
      <View style={{ height: 1, backgroundColor: c.surface }} />
      <IntensitySection
        label="Consistencia"
        emoji="💩"
        config={consistency}
        onChange={setConsistency}
      />
      <View style={{ height: 1, backgroundColor: c.surface }} />
      <HealthSection
        label="Popómetro (color de heces)"
        emoji="🔬"
        config={health}
        onChange={setHealth}
      />
    </View>
  );
}
