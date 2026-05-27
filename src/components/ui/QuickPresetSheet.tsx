import { useState } from "react";
import {
  View, Text, TouchableOpacity,
  TextInput, Modal, Platform,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { DateTimePicker } from "./DateTimePicker";
import { BigButton } from "./BigButton";
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
  const [timestamp, setTimestamp] = useState(new Date());
  const [notes, setNotes] = useState("");

  if (!preset) return null;

  const vals = (() => { try { return JSON.parse(preset.defaultValues ?? '{}'); } catch { return {}; } })();
  const units = (() => { try { return JSON.parse(preset.defaultUnitOverrides ?? '{}'); } catch { return {}; } })();
  const valueText = Object.entries(vals)
    .map(([k, v]) => {
      const unit = units[k] ? (units[k] === "drop" ? "gotas" : units[k]) : "";
      return `${v}${unit ? " " + unit : ""}`;
    })
    .join(", ");

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
            <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>
              {valueText || "Sin valores"}
            </Text>
          </View>

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
            title="Guardar"
            onPress={() => onSave(timestamp, notes)}
            loading={saving}
            disabled={saving}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
