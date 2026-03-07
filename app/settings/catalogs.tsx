import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BigButton } from "@/src/components/ui/BigButton";
import {
  useEventTypes,
  useDiaperObservations,
  useCreateEventType,
  useCreateDiaperObservation,
} from "@/src/hooks/useTimeline";
import { getDb } from "@/src/db/client";
import { eventTypes, diaperObservations } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { useQueryClient } from "@tanstack/react-query";

export default function CatalogsScreen() {
  const { data: events } = useEventTypes();
  const { data: diapers } = useDiaperObservations();

  const createEvent = useCreateEventType();
  const createDiaper = useCreateDiaperObservation();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"events" | "diapers">("events");

  // Form states
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("other"); // only for events

  const isFormValid = emoji.trim() && label.trim();

  const handleSave = () => {
    if (!isFormValid) return;
    if (activeTab === "events") {
      createEvent.mutate(
        { emoji: emoji.trim(), label: label.trim(), category },
        {
          onSuccess: () => {
            setEmoji("");
            setLabel("");
            setCategory("other");
          },
        },
      );
    } else {
      createDiaper.mutate(
        { emoji: emoji.trim(), label: label.trim() },
        {
          onSuccess: () => {
            setEmoji("");
            setLabel("");
          },
        },
      );
    }
  };

  const handleDeleteEvent = async (id: string, isSystem: boolean | null) => {
    if (isSystem)
      return Alert.alert("Ups", "No puedes borrar un tipo del sistema.");
    Alert.alert("Confirmar", "¿Borrar este tipo de evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await getDb().delete(eventTypes).where(eq(eventTypes.id, id));
          qc.invalidateQueries({ queryKey: ["event_types"] });
        },
      },
    ]);
  };

  const handleDeleteDiaper = async (id: string, isSystem: boolean | null) => {
    if (isSystem)
      return Alert.alert(
        "Ups",
        "No puedes borrar una observación del sistema.",
      );
    Alert.alert("Confirmar", "¿Borrar esta observación?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await getDb()
            .delete(diaperObservations)
            .where(eq(diaperObservations.id, id));
          qc.invalidateQueries({ queryKey: ["diaper_observations"] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FF8AB3" }}
      edges={["top"]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 16 }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 26, lineHeight: 28 }}>
            ←
          </Text>
        </TouchableOpacity>
        <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 18 }}>
          🛠️ Personalizar
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#FF8AB3",
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 3,
              borderBottomColor:
                activeTab === "events" ? "#FFFFFF" : "transparent",
            }}
            onPress={() => setActiveTab("events")}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "800",
                color:
                  activeTab === "events" ? "#FFFFFF" : "rgba(255,255,255,0.6)",
              }}
            >
              📝 Tipos de Eventos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 3,
              borderBottomColor:
                activeTab === "diapers" ? "#FFFFFF" : "transparent",
            }}
            onPress={() => setActiveTab("diapers")}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "800",
                color:
                  activeTab === "diapers" ? "#FFFFFF" : "rgba(255,255,255,0.6)",
              }}
            >
              🧷 Obs. de Pañal
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: "#FFF0F5" }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 13,
                color: "#9B7A88",
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              Añadir nuevo {activeTab === "events" ? "evento" : "observación"}
            </Text>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
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
                  placeholder={
                    activeTab === "events" ? "Ej. Baño" : "Ej. Ligeramente rojo"
                  }
                  value={label}
                  onChangeText={setLabel}
                />
              </View>
            </View>

            {activeTab === "events" && (
              <View style={{ marginBottom: 16 }}>
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
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {["health", "growth", "other"].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 99,
                        borderWidth: 1.5,
                        backgroundColor:
                          category === cat ? "#FFE4EE" : "#FFF0F5",
                        borderColor:
                          category === cat ? "#FF5C9A" : "transparent",
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
            )}

            <BigButton
              label={`Añadir ${activeTab === "events" ? "Evento" : "Obs."}`}
              disabled={
                !isFormValid || createEvent.isPending || createDiaper.isPending
              }
              onPress={handleSave}
            />
          </View>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 13,
                color: "#9B7A88",
                marginBottom: 16,
                textTransform: "uppercase",
              }}
            >
              Tus catálogos (
              {activeTab === "events"
                ? events?.length || 0
                : diapers?.length || 0}
              )
            </Text>

            <View style={{ gap: 8 }}>
              {activeTab === "events" &&
                events?.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#FFF0F5",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                      <View>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "800",
                            color: "#2D1B26",
                          }}
                        >
                          {item.label}
                        </Text>
                        {!!item.isSystem && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#FF5C9A",
                              fontWeight: "800",
                            }}
                          >
                            SISTEMA
                          </Text>
                        )}
                      </View>
                    </View>
                    {!item.isSystem && (
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteEvent(item.id, item.isSystem)
                        }
                      >
                        <Text style={{ color: "#EF4444", fontSize: 18 }}>
                          🗑️
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

              {activeTab === "diapers" &&
                diapers?.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#FFF0F5",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                      <View>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "800",
                            color: "#2D1B26",
                          }}
                        >
                          {item.label}
                        </Text>
                        {!!item.isSystem && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#FF5C9A",
                              fontWeight: "800",
                            }}
                          >
                            SISTEMA
                          </Text>
                        )}
                      </View>
                    </View>
                    {!item.isSystem && (
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteDiaper(item.id, item.isSystem)
                        }
                      >
                        <Text style={{ color: "#EF4444", fontSize: 18 }}>
                          🗑️
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
