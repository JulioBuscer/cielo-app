import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BigButton } from "./BigButton";
import {
  useCreateEventType,
  useCreateDiaperObservation,
} from "@/src/hooks/useTimeline";

export function InlineEventTypeModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const create = useCreateEventType();
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("other");

  const isFormValid = emoji.trim() && label.trim();

  const handleSave = () => {
    if (!isFormValid) return;
    create.mutate(
      { emoji: emoji.trim(), label: label.trim(), category },
      {
        onSuccess: (id) => {
          setEmoji("");
          setLabel("");
          setCategory("other");
          onSelect(id);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontWeight: "900", fontSize: 18, color: "#2D1B26" }}
              >
                Nuevo Tipo de Evento
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 24, color: "#9B7A88" }}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ width: 60 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: "#9B7A88",
                    marginBottom: 4,
                  }}
                >
                  EMOJI
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#FFF0F5",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 20,
                    textAlign: "center",
                    color: "#2D1B26",
                  }}
                  placeholder="✨"
                  maxLength={2}
                  value={emoji}
                  onChangeText={setEmoji}
                  autoFocus
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: "#9B7A88",
                    marginBottom: 4,
                  }}
                >
                  NOMBRE
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#FFF0F5",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 15,
                    color: "#2D1B26",
                  }}
                  placeholder="Ej. Baño"
                  value={label}
                  onChangeText={setLabel}
                />
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: "#9B7A88",
                  marginBottom: 4,
                }}
              >
                CATEGORÍA
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {["health", "growth", "other"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 99,
                      borderWidth: 1.5,
                      backgroundColor: category === cat ? "#FFE4EE" : "#FFF0F5",
                      borderColor: category === cat ? "#FF5C9A" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: category === cat ? "#FF5C9A" : "#9B7A88",
                        textTransform: "capitalize",
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <BigButton
              label="Añadir Evento"
              disabled={!isFormValid || create.isPending}
              onPress={handleSave}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function InlineDiaperObservationModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const create = useCreateDiaperObservation();
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");

  const isFormValid = emoji.trim() && label.trim();

  const handleSave = () => {
    if (!isFormValid) return;
    create.mutate(
      { emoji: emoji.trim(), label: label.trim() },
      {
        onSuccess: (id) => {
          setEmoji("");
          setLabel("");
          onSelect(id);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontWeight: "900", fontSize: 18, color: "#2D1B26" }}
              >
                Nueva Observación
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 24, color: "#9B7A88" }}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <View style={{ width: 60 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: "#9B7A88",
                    marginBottom: 4,
                  }}
                >
                  EMOJI
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#FFF0F5",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 20,
                    textAlign: "center",
                    color: "#2D1B26",
                  }}
                  placeholder="✨"
                  maxLength={2}
                  value={emoji}
                  onChangeText={setEmoji}
                  autoFocus
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: "#9B7A88",
                    marginBottom: 4,
                  }}
                >
                  NOMBRE
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#FFF0F5",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 15,
                    color: "#2D1B26",
                  }}
                  placeholder="Ej. Ligeramente rojo"
                  value={label}
                  onChangeText={setLabel}
                />
              </View>
            </View>

            <BigButton
              label="Añadir Observación"
              disabled={!isFormValid || create.isPending}
              onPress={handleSave}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
