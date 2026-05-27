import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { ZoneEditor } from "./ZoneEditor";
import { generateId } from "@/src/utils/id";
import { safeJsonParse } from "@/src/utils/safeJsonParse";
import type { Zone } from "./types";
import type { DiaperObservation, ObservationMetric, ObservationZone } from "@/src/db/schema";

export function ObservationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DiaperObservation;
  onSave: (data: {
    emoji: string;
    label: string;
    isAlert: boolean;
    metrics: string;
  }) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [isAlert, setIsAlert] = useState(initial?.isAlert ?? false);
  const [metrics, setMetrics] = useState<ObservationMetric[]>(
    initial?.metrics ? safeJsonParse(initial.metrics, [] as ObservationMetric[]) : []
  );

  const isValid = emoji.trim() && label.trim();

  const addMetric = () => {
    setMetrics((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        scaleMin: 1,
        scaleMax: 10,
        zones: [],
      },
    ]);
  };

  const removeMetric = (idx: number) => {
    setMetrics((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMetric = (idx: number, upd: Partial<ObservationMetric>) => {
    setMetrics((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...upd };
      return copy;
    });
  };

  const updateMetricZones = (idx: number, zones: Zone[]) => {
    setMetrics((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], zones: zones as ObservationZone[] };
      return copy;
    });
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      emoji: emoji.trim(),
      label: label.trim(),
      isAlert,
      metrics: JSON.stringify(metrics),
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={onCancel}
          style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: c.textBody, fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: c.textBody,
              fontWeight: "900",
              fontSize: 18,
            }}
          >
            {initial ? "✏️ Editar observación" : "➕ Nueva observación"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid}
          style={{
            backgroundColor: isValid ? c.accent : c.elevated,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 99,
            minHeight: 44,
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: c.textBody,
              fontWeight: "800",
              fontSize: 14,
            }}
          >
            💾 Guardar
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 60 }}>
          <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 11 }}>
            EMOJI
          </Text>
          <TextInput
            value={emoji}
            onChangeText={setEmoji}
            placeholder="✨"
            maxLength={2}
            style={{
              backgroundColor: c.card,
              borderRadius: 12,
              padding: 12,
              fontSize: 20,
              textAlign: "center",
              color: c.textBody,
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 11 }}>
            NOMBRE
          </Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Ej. Sangre"
            placeholderTextColor={c.textMuted}
            style={{
              backgroundColor: c.card,
              borderRadius: 12,
              padding: 12,
              fontSize: 15,
              color: c.textBody,
            }}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
          🚨 Es alerta médica
        </Text>
        <TouchableOpacity
          onPress={() => setIsAlert(!isAlert)}
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor: isAlert ? c.danger : c.elevated,
            padding: 3,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: c.textBody,
              alignSelf: isAlert ? "flex-end" : "flex-start",
            }}
          />
        </TouchableOpacity>
      </View>

      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
            📊 Métricas (escalas)
          </Text>
          <TouchableOpacity
            onPress={addMetric}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: c.accent,
            }}
          >
            <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 12 }}>
              + Añadir
            </Text>
          </TouchableOpacity>
        </View>

        {metrics.length === 0 && (
          <Text style={{ color: c.textMuted, fontSize: 13 }}>
            Sin escala — solo se mostrará como tag
          </Text>
        )}

        {metrics.map((m, idx) => (
          <View
            key={m.id}
            style={{
              backgroundColor: c.card,
              borderRadius: 12,
              padding: 14,
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <TextInput
                value={m.name}
                onChangeText={(v) => updateMetric(idx, { name: v })}
                placeholder="Nombre (ej: Intensidad)"
                placeholderTextColor={c.textMuted}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 8,
                  padding: 8,
                  color: c.textBody,
                  fontSize: 13,
                  flex: 1,
                  marginRight: 8,
                }}
              />
              <TouchableOpacity onPress={() => removeMetric(idx)}>
                <Text style={{ color: c.danger, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 11 }}>
                  Min
                </Text>
                <TextInput
                  value={String(m.scaleMin)}
                  onChangeText={(v) =>
                    updateMetric(idx, { scaleMin: v === '' ? 0 : parseInt(v) || 0 })
                  }
                  keyboardType="number-pad"
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: 8,
                    padding: 8,
                    color: c.textBody,
                    fontSize: 14,
                    textAlign: "center",
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 11 }}>
                  Max
                </Text>
                <TextInput
                  value={String(m.scaleMax)}
                  onChangeText={(v) =>
                    updateMetric(idx, { scaleMax: v === '' ? 0 : parseInt(v) || 0 })
                  }
                  keyboardType="number-pad"
                  style={{
                    backgroundColor: c.surface,
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
              zones={m.zones as Zone[]}
              onChange={(z) => updateMetricZones(idx, z)}
              showEmoji
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
