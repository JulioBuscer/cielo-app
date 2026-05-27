import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import type { Zone } from "./types";

export const COLORS = ["#4CAF50", "#FFC107", "#FF9800", "#F44336", "#9C27B0", "#2196F3"];

export function ZoneEditor({
  zones,
  onChange,
  showEmoji,
}: {
  zones: Zone[];
  onChange: (z: Zone[]) => void;
  showEmoji?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const add = () => {
    const prevMax = zones.length > 0 ? zones[zones.length - 1].max : 0;
    onChange([
      ...zones,
      { min: prevMax + 1, max: prevMax + 2, color: c.textMuted, label: "" },
    ]);
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 12 }}>
        Zonas de color
      </Text>
      {zones.map((z, i) => (
        <View
          key={i}
          style={{
            backgroundColor: c.surface,
            borderRadius: 10,
            padding: 10,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={String(z.min)}
              onChangeText={(v) => {
                const n = v === '' ? 0 : parseInt(v) || 0;
                const copy = [...zones];
                copy[i] = { ...copy[i], min: n };
                onChange(copy);
              }}
              keyboardType="number-pad"
              style={{
                backgroundColor: c.card,
                borderRadius: 8,
                padding: 6,
                color: c.textBody,
                fontSize: 13,
                width: 40,
                textAlign: "center",
              }}
            />
            <Text style={{ color: c.textMuted }}>→</Text>
            <TextInput
              value={String(z.max)}
              onChangeText={(v) => {
                const n = v === '' ? 0 : parseInt(v) || 0;
                const copy = [...zones];
                copy[i] = { ...copy[i], max: n };
                onChange(copy);
              }}
              keyboardType="number-pad"
              style={{
                backgroundColor: c.card,
                borderRadius: 8,
                padding: 6,
                color: c.textBody,
                fontSize: 13,
                width: 40,
                textAlign: "center",
              }}
            />
            <View style={{ flexDirection: "row", gap: 4, flex: 1 }}>
              {COLORS.map((colorVal) => (
                <TouchableOpacity
                  key={colorVal}
                  onPress={() => {
                    const copy = [...zones];
                    copy[i] = { ...copy[i], color: colorVal };
                    onChange(copy);
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colorVal,
                    borderWidth: z.color === colorVal ? 2 : 0,
                    borderColor: c.textBody,
                  }}
                />
              ))}
            </View>
            <TouchableOpacity
              onPress={() => onChange(zones.filter((_, j) => j !== i))}
            >
              <Text style={{ color: c.danger, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={z.label}
            onChangeText={(v) => {
              const copy = [...zones];
              copy[i] = { ...copy[i], label: v };
              onChange(copy);
            }}
            placeholder="Etiqueta (ej: Leve)"
            placeholderTextColor={c.textMuted}
            style={{
              backgroundColor: c.card,
              borderRadius: 8,
              padding: 6,
              color: c.textBody,
              fontSize: 12,
              flex: showEmoji ? undefined : 1,
            }}
          />
          {showEmoji && (
            <TextInput
              value={z.emoji ?? ""}
              onChangeText={(v) => {
                const copy = [...zones];
                copy[i] = { ...copy[i], emoji: v };
                onChange(copy);
              }}
              placeholder="🩸"
              maxLength={2}
              style={{
                backgroundColor: c.card,
                borderRadius: 8,
                padding: 6,
                color: c.textBody,
                fontSize: 14,
                width: 38,
                textAlign: "center",
              }}
            />
          )}
          <TextInput
            value={z.note ?? ""}
            onChangeText={(v) => {
              const copy = [...zones];
              copy[i] = { ...copy[i], note: v };
              onChange(copy);
            }}
            placeholder="Nota médica (opcional, ej: Sangre fresca. Consulta al pediatra)"
            placeholderTextColor={c.textMuted}
            style={{
              backgroundColor: c.card,
              borderRadius: 8,
              padding: 6,
              color: c.textBody,
              fontSize: 11,
              flex: 1,
            }}
          />
        </View>
      ))}
      <TouchableOpacity
        onPress={add}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 99,
          backgroundColor: c.card,
        }}
      >
        <Text style={{ color: c.accent, fontWeight: "700", fontSize: 12 }}>
          + Añadir zona
        </Text>
      </TouchableOpacity>
    </View>
  );
}
