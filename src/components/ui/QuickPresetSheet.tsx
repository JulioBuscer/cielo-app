import { useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity,
  TextInput, Modal, Platform,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { DateTimePicker } from "./DateTimePicker";
import { BigButton } from "./BigButton";
import { getUnit } from "@/src/units/registry";
import { useEventTypes } from "@/src/hooks/useTimeline";
import type { EventPreset } from "@/src/hooks/useEventPresets";

export function QuickPresetSheet({
  preset,
  visible,
  onClose,
  onSave,
  saving,
}: {
  preset: EventPreset | null;
  visible: boolean;
  onClose: () => void;
  onSave: (timestamp: Date, notes: string) => void;
  saving: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: eventTypes } = useEventTypes();
  const [timestamp, setTimestamp] = useState(new Date());
  const [notes, setNotes] = useState("");

  const eventType = useMemo(() => {
    if (!preset || !eventTypes) return null;
    return eventTypes.find((et) => et.id === preset.eventTypeId) ?? null;
  }, [preset, eventTypes]);

  const metricList = useMemo(() => {
    if (!eventType) return [];
    try {
      return JSON.parse(eventType.metrics ?? "[]") as Array<{
        id: string;
        name: string;
        unitId: string;
      }>;
    } catch {
      return [];
    }
  }, [eventType]);

  const units = useMemo(() => {
    if (!preset) return {};
    try { return JSON.parse(preset.defaultUnitOverrides ?? "{}"); } catch { return {}; }
  }, [preset]);

  const vals = useMemo(() => {
    if (!preset) return {};
    try { return JSON.parse(preset.defaultValues ?? "{}") as Record<string, number>; } catch { return {}; }
  }, [preset]);

  const namedValues = useMemo(() => {
    return Object.entries(vals).map(([metricId, value]) => {
      const metric = metricList.find((m) => m.id === metricId);
      const unitId = (units as Record<string, string>)[metricId] ?? metric?.unitId;
      const unit = unitId ? getUnit(unitId) : undefined;
      return {
        name: metric?.name ?? metricId,
        value,
        unit: unit?.symbol ?? "",
      };
    });
  }, [vals, metricList, units]);

  if (!preset) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            gap: 20,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
          }}
        >
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 40 }}>{preset.emoji}</Text>
            <Text style={{ color: c.textBody, fontSize: 20, fontWeight: "800" }}>{preset.name}</Text>
            {eventType && (
              <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>
                {eventType.emoji} {eventType.label}
              </Text>
            )}
          </View>

          {namedValues.length > 0 && (
            <View style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, gap: 8 }}>
              {namedValues.map((nv) => (
                <View key={nv.name} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>{nv.name}</Text>
                  <Text style={{ color: c.textBody, fontSize: 16, fontWeight: "800" }}>
                    {nv.value}{nv.unit ? ` ${nv.unit}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <DateTimePicker value={timestamp} onChange={setTimestamp} />
          </View>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={preset.defaultNotes ?? "Nota opcional..."}
            placeholderTextColor={c.textDim}
            multiline
            style={{
              backgroundColor: c.elevated,
              borderRadius: 12, padding: 12,
              color: c.textBody, fontSize: 15,
              minHeight: 60, textAlignVertical: "top",
            }}
          />

          <BigButton
            title={namedValues.length > 0 ? `Guardar ${preset.emoji ?? ""}` : "Guardar"}
            onPress={() => onSave(timestamp, notes)}
            loading={saving}
            disabled={saving}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
