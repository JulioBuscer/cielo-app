import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { ZoneEditor } from "./ZoneEditor";
import { getUnit, getUnitsByDimension } from "@/src/units/registry";
import { generateId } from "@/src/utils/id";
import type { Zone } from "./types";
import type { EventType, ObservationZone } from "@/src/db/schema";
import type { EventMetric } from "@/src/units/types";

const DIMENSIONS: { id: string; label: string }[] = [
  { id: "mass", label: "Masa" },
  { id: "volume", label: "Volumen" },
  { id: "temperature", label: "Temperatura" },
  { id: "length", label: "Longitud" },
  { id: "dimensionless", label: "Sin unidad" },
];

export function EventMetricsEditor({
  eventType,
  onSave,
  onCancel,
}: {
  eventType: EventType;
  onSave: (metrics: EventMetric[]) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [metrics, setMetrics] = useState<EventMetric[]>(
    eventType.metrics ? JSON.parse(eventType.metrics) : []
  );
  const [hasChanges, setHasChanges] = useState(false);

  const unitDimension = (unitId: string): string => {
    const u = getUnit(unitId);
    return u ? u.dimension : "mass";
  };

  const updateMetric = (idx: number, upd: Partial<EventMetric>) => {
    setMetrics((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...upd };
      return copy;
    });
    setHasChanges(true);
  };

  const updateMetricZones = (idx: number, zones: Zone[]) => {
    setMetrics((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], zones: zones as ObservationZone[] };
      return copy;
    });
    setHasChanges(true);
  };

  const addMetric = () => {
    setMetrics((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        unitId: "count",
        zones: [],
      },
    ]);
    setHasChanges(true);
  };

  const removeMetric = (idx: number) => {
    setMetrics((prev) => prev.filter((_, i) => i !== idx));
    setHasChanges(true);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
            ⚙️ Métricas
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>
            {eventType.emoji} {eventType.label}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onSave(metrics)}
          disabled={!hasChanges}
          style={{
            backgroundColor: hasChanges ? c.accent : c.elevated,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 99,
            minHeight: 44,
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: hasChanges ? "#FFFFFF" : c.textMuted,
              fontWeight: "800",
              fontSize: 14,
            }}
          >
            💾 Guardar
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={addMetric}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: c.card,
          borderRadius: 14,
          padding: 16,
          minHeight: 52,
          borderWidth: 1,
          borderColor: c.elevated,
          borderStyle: "dashed",
        }}
      >
        <Text style={{ fontSize: 18 }}>➕</Text>
        <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 14 }}>
          Añadir métrica
        </Text>
      </TouchableOpacity>

      {metrics.length === 0 && (
        <Text
          style={{
            color: c.textMuted,
            fontSize: 14,
            textAlign: "center",
            paddingVertical: 24,
          }}
        >
          Sin métricas — el evento solo tendrá notas y fecha
        </Text>
      )}

      {metrics.map((m, idx) => {
        const currentDim = unitDimension(m.unitId);
        const availableUnits = getUnitsByDimension(currentDim);
        return (
          <View
            key={m.id}
            style={{
              backgroundColor: c.card,
              borderRadius: 16,
              padding: 16,
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "800",
                  fontSize: 13,
                  color: c.accent,
                }}
              >
                #{idx + 1}
              </Text>
              <TouchableOpacity
                onPress={() => removeMetric(idx)}
                style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}
              >
                <Text style={{ color: c.danger, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={m.name}
              onChangeText={(v) => updateMetric(idx, { name: v })}
              placeholder="Nombre de la métrica"
              placeholderTextColor={c.textMuted}
              style={{
                backgroundColor: c.surface,
                borderRadius: 12,
                padding: 14,
                color: c.textBody,
                fontSize: 15,
                fontWeight: "600",
                minHeight: 48,
              }}
            />

            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: c.textMuted,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Dimensión
              </Text>
              <View
                style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
              >
                {DIMENSIONS.map((dim) => (
                  <TouchableOpacity
                    key={dim.id}
                    onPress={() => {
                      const units = getUnitsByDimension(dim.id);
                      updateMetric(idx, { unitId: units[0]?.id ?? "count" });
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 99,
                      backgroundColor:
                        currentDim === dim.id ? c.accent : c.surface,
                      minHeight: 36,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color:
                          currentDim === dim.id ? "#FFFFFF" : c.textMuted,
                      }}
                    >
                      {dim.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: c.textMuted,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Unidad
              </Text>
              <View
                style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
              >
                {availableUnits.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => updateMetric(idx, { unitId: u.id })}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 99,
                      backgroundColor:
                        m.unitId === u.id ? c.accent : c.surface,
                      minHeight: 36,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: m.unitId === u.id ? "#FFFFFF" : c.textMuted,
                      }}
                    >
                      {u.symbol || u.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: c.textMuted,
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  Mín
                </Text>
                <TextInput
                  value={m.scaleMin != null ? String(m.scaleMin) : ""}
                  onChangeText={(v) =>
                    updateMetric(idx, {
                      scaleMin: v === "" ? undefined : parseFloat(v) || 0,
                    })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={c.textMuted}
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: 10,
                    padding: 12,
                    color: c.textBody,
                    fontSize: 14,
                    textAlign: "center",
                    minHeight: 44,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: c.textMuted,
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  Máx
                </Text>
                <TextInput
                  value={m.scaleMax != null ? String(m.scaleMax) : ""}
                  onChangeText={(v) =>
                    updateMetric(idx, {
                      scaleMax: v === "" ? undefined : parseFloat(v) || 0,
                    })
                  }
                  keyboardType="decimal-pad"
                  placeholder="10"
                  placeholderTextColor={c.textMuted}
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: 10,
                    padding: 12,
                    color: c.textBody,
                    fontSize: 14,
                    textAlign: "center",
                    minHeight: 44,
                  }}
                />
              </View>
            </View>

            <ZoneEditor
              zones={m.zones ?? []}
              onChange={(z) => updateMetricZones(idx, z)}
              showEmoji
            />
          </View>
        );
      })}
    </ScrollView>
  );
}
