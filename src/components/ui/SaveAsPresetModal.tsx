import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";

export function SaveAsPresetModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string, isQuickAction: boolean) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [isQuickAction, setIsQuickAction] = useState(false);
  const [saving, setSaving] = useState(false);

  const isValid = name.trim().length > 0 && emoji.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    await onSave(name.trim(), emoji.trim(), isQuickAction);
    setSaving(false);
    setName("");
    setEmoji("");
    setIsQuickAction(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 20 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 32 }}>📋</Text>
              <Text style={{ color: c.textBody, fontSize: 18, fontWeight: "800" }}>
                Guardar como plantilla
              </Text>
              <Text style={{ color: c.textDim, fontSize: 13, textAlign: "center" }}>
                Los valores actuales se guardarán como valores por defecto
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 64 }}>
                <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>
                  Emoji
                </Text>
                <TextInput
                  value={emoji}
                  onChangeText={setEmoji}
                  placeholder="💊"
                  maxLength={2}
                  style={{
                    backgroundColor: c.card, borderRadius: 12, padding: 12,
                    fontSize: 24, textAlign: "center", color: c.textBody,
                    minHeight: 48,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>
                  Nombre
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej: Paracetamol 125mg"
                  placeholderTextColor={c.textDim}
                  style={{
                    backgroundColor: c.card, borderRadius: 12, padding: 12,
                    fontSize: 15, color: c.textBody, minHeight: 48,
                  }}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsQuickAction(!isQuickAction)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                borderColor: isQuickAction ? c.accent : c.textDim,
                backgroundColor: isQuickAction ? c.accent : "transparent",
                alignItems: "center", justifyContent: "center",
              }}>
                {isQuickAction && <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13 }}>
                Mostrar en inicio
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  backgroundColor: c.card, alignItems: "center", minHeight: 48,
                }}
              >
                <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 15 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!isValid || saving}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  backgroundColor: isValid ? c.accent : c.textDim + "40",
                  alignItems: "center", minHeight: 48,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: isValid ? "#FFF" : c.textMuted, fontWeight: "800", fontSize: 15 }}>
                    Guardar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
