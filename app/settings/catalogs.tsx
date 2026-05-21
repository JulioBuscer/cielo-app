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
  Modal,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BigButton } from "@/src/components/ui/BigButton";
import {
  useEventTypes,
  useDiaperObservations,
  useCreateEventType,
  useCreateDiaperObservation,
  useUpdateDiaperObservation,
} from "@/src/hooks/useTimeline";
import { getDb } from "@/src/db/client";
import { eventTypes, diaperObservations } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { useQueryClient } from "@tanstack/react-query";
import type { DiaperObservation } from "@/src/db/schema";

const COLORS = ["#4CAF50", "#FFC107", "#FF9800", "#F44336", "#9C27B0", "#2196F3"];

function ZoneEditor({
  zones,
  onChange,
}: {
  zones: { min: number; max: number; color: string; label: string }[];
  onChange: (z: { min: number; max: number; color: string; label: string }[]) => void;
}) {
  const add = () => {
    const prevMax = zones.length > 0 ? zones[zones.length - 1].max : 0;
    onChange([
      ...zones,
      { min: prevMax + 1, max: prevMax + 2, color: "#888", label: "" },
    ]);
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 12 }}>
        Zonas de color
      </Text>
      {zones.map((z, i) => (
        <View
          key={i}
          style={{
            backgroundColor: "#1A1A2E",
            borderRadius: 10,
            padding: 10,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={String(z.min)}
              onChangeText={(v) => {
                const n = parseInt(v) || 1;
                const copy = [...zones];
                copy[i] = { ...copy[i], min: n };
                onChange(copy);
              }}
              keyboardType="number-pad"
              style={{
                backgroundColor: "#2A2A3E",
                borderRadius: 8,
                padding: 6,
                color: "#FFF",
                fontSize: 13,
                width: 40,
                textAlign: "center",
              }}
            />
            <Text style={{ color: "#888" }}>→</Text>
            <TextInput
              value={String(z.max)}
              onChangeText={(v) => {
                const n = parseInt(v) || 1;
                const copy = [...zones];
                copy[i] = { ...copy[i], max: n };
                onChange(copy);
              }}
              keyboardType="number-pad"
              style={{
                backgroundColor: "#2A2A3E",
                borderRadius: 8,
                padding: 6,
                color: "#FFF",
                fontSize: 13,
                width: 40,
                textAlign: "center",
              }}
            />
            <View style={{ flexDirection: "row", gap: 4, flex: 1 }}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    const copy = [...zones];
                    copy[i] = { ...copy[i], color: c };
                    onChange(copy);
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: c,
                    borderWidth: z.color === c ? 2 : 0,
                    borderColor: "#FFF",
                  }}
                />
              ))}
            </View>
            <TouchableOpacity
              onPress={() => onChange(zones.filter((_, j) => j !== i))}
            >
              <Text style={{ color: "#F44336", fontSize: 16 }}>✕</Text>
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
            placeholderTextColor="#666"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 8,
              padding: 6,
              color: "#FFF",
              fontSize: 12,
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
          backgroundColor: "#2A2A3E",
        }}
      >
        <Text style={{ color: "#FF8AB3", fontWeight: "700", fontSize: 12 }}>
          + Añadir zona
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ObservationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DiaperObservation;
  onSave: (data: {
    emoji: string;
    label: string;
    scaleMin: number | null;
    scaleMax: number | null;
    zones: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [hasScale, setHasScale] = useState(
    initial ? initial.scaleMin != null : false
  );
  const [scaleMin, setScaleMin] = useState(
    String(initial?.scaleMin ?? 1)
  );
  const [scaleMax, setScaleMax] = useState(
    String(initial?.scaleMax ?? 10)
  );
  const [zones, setZones] = useState<
    { min: number; max: number; color: string; label: string }[]
  >(initial?.zones ? JSON.parse(initial.zones) : []);

  const isValid =
    emoji.trim() && label.trim() && (!hasScale || (!!scaleMin && !!scaleMax));

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      emoji: emoji.trim(),
      label: label.trim(),
      scaleMin: hasScale ? parseInt(scaleMin) : null,
      scaleMax: hasScale ? parseInt(scaleMax) : null,
      zones: hasScale && zones.length > 0 ? JSON.stringify(zones) : null,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontWeight: "900",
          fontSize: 18,
          textAlign: "center",
        }}
      >
        {initial ? "✏️ Editar observación" : "➕ Nueva observación"}
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 60 }}>
          <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
            EMOJI
          </Text>
          <TextInput
            value={emoji}
            onChangeText={setEmoji}
            placeholder="✨"
            maxLength={2}
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 12,
              fontSize: 20,
              textAlign: "center",
              color: "#FFF",
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
            NOMBRE
          </Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Ej. Ligeramente rojo"
            placeholderTextColor="#666"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 12,
              fontSize: 15,
              color: "#FFF",
            }}
          />
        </View>
      </View>

      {/* Scale toggle */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
          📊 Tiene escala de intensidad
        </Text>
        <TouchableOpacity
          onPress={() => {
            setHasScale(!hasScale);
            if (!hasScale) {
              setScaleMin("1");
              setScaleMax("10");
              setZones([]);
            }
          }}
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor: hasScale ? "#FF8AB3" : "#3A3A4E",
            padding: 3,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#FFF",
              alignSelf: hasScale ? "flex-end" : "flex-start",
            }}
          />
        </TouchableOpacity>
      </View>

      {hasScale && (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
                Mínimo
              </Text>
              <TextInput
                value={scaleMin}
                onChangeText={setScaleMin}
                keyboardType="number-pad"
                style={{
                  backgroundColor: "#2A2A3E",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  color: "#FFF",
                  textAlign: "center",
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
                Máximo
              </Text>
              <TextInput
                value={scaleMax}
                onChangeText={setScaleMax}
                keyboardType="number-pad"
                style={{
                  backgroundColor: "#2A2A3E",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  color: "#FFF",
                  textAlign: "center",
                }}
              />
            </View>
          </View>

          <ZoneEditor zones={zones} onChange={setZones} />
        </>
      )}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <TouchableOpacity
          onPress={onCancel}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 99,
            backgroundColor: "#2A2A3E",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#888", fontWeight: "700", fontSize: 14 }}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid}
          style={{
            flex: 2,
            paddingVertical: 12,
            borderRadius: 99,
            backgroundColor: isValid ? "#FF8AB3" : "#3A3A4E",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontWeight: "800",
              fontSize: 14,
            }}
          >
            {initial ? "💾 Guardar" : "➕ Crear"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function PeePoopConfig({
  peeScale,
  setPeeScale,
  peeZones,
  setPeeZones,
}: {
  peeScale: { min: number; max: number };
  setPeeScale: (s: { min: number; max: number }) => void;
  peeZones: { min: number; max: number; color: string; label: string }[];
  setPeeZones: (z: { min: number; max: number; color: string; label: string }[]) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: "#FFD700", fontWeight: "800", fontSize: 14 }}>
        💦 Configurar Pipímetro
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
            Mínimo
          </Text>
          <TextInput
            value={String(peeScale.min)}
            onChangeText={(v) =>
              setPeeScale({ ...peeScale, min: parseInt(v) || 1 })
            }
            keyboardType="number-pad"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              color: "#FFF",
              textAlign: "center",
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
            Máximo
          </Text>
          <TextInput
            value={String(peeScale.max)}
            onChangeText={(v) =>
              setPeeScale({ ...peeScale, max: parseInt(v) || 8 })
            }
            keyboardType="number-pad"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              color: "#FFF",
              textAlign: "center",
            }}
          />
        </View>
      </View>
      <ZoneEditor zones={peeZones} onChange={setPeeZones} />
    </View>
  );
}

export default function CatalogsScreen() {
  const { data: events } = useEventTypes();
  const { data: diaperObs } = useDiaperObservations();
  const createEvent = useCreateEventType();
  const createDiaper = useCreateDiaperObservation();
  const updateDiaper = useUpdateDiaperObservation();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"events" | "diapers">("events");
  const [showForm, setShowForm] = useState(false);
  const [editingObs, setEditingObs] = useState<DiaperObservation | null>(null);

  // Pee/Poop config (stored in AsyncStorage as fallback)
  const [peeScale, setPeeScale] = useState({ min: 1, max: 8 });
  const [peeZones, setPeeZones] = useState([
    { min: 1, max: 3, color: "#4CAF50", label: "Saludable" },
    { min: 4, max: 6, color: "#FFC107", label: "Precaución" },
    { min: 7, max: 8, color: "#F44336", label: "Alerta" },
  ]);

  // Form states for events tab
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("other");

  const isEventFormValid = emoji.trim() && label.trim();

  const handleSaveEvent = () => {
    if (!isEventFormValid) return;
    createEvent.mutate(
      { emoji: emoji.trim(), label: label.trim(), category },
      {
        onSuccess: () => {
          setEmoji("");
          setLabel("");
          setCategory("other");
        },
      }
    );
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
        "No puedes borrar una observación del sistema."
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

  const handleObservationSave = (data: {
    emoji: string;
    label: string;
    scaleMin: number | null;
    scaleMax: number | null;
    zones: string | null;
  }) => {
    if (editingObs) {
      updateDiaper.mutate(
        { id: editingObs.id, ...data },
        { onSuccess: () => setEditingObs(null) }
      );
    } else {
      createDiaper.mutate(data, { onSuccess: () => setShowForm(false) });
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FF8AB3" }}
      edges={["top"]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
        }}
      >
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
        {/* ─── Tabs ─── */}
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
                  activeTab === "events"
                    ? "#FFFFFF"
                    : "rgba(255,255,255,0.6)",
              }}
            >
              📝 Eventos
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
                  activeTab === "diapers"
                    ? "#FFFFFF"
                    : "rgba(255,255,255,0.6)",
              }}
            >
              🧷 Obs. Pañal
            </Text>
          </TouchableOpacity>
        </View>

        {showForm || editingObs ? (
          <View
            style={{
              flex: 1,
              backgroundColor: "#1A1A2E",
            }}
          >
            <ObservationForm
              initial={editingObs ?? undefined}
              onSave={handleObservationSave}
              onCancel={() => {
                setShowForm(false);
                setEditingObs(null);
              }}
            />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1, backgroundColor: "#FFF0F5" }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Events Tab ─── */}
            {activeTab === "events" && (
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
                  Añadir nuevo evento
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
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
                      placeholder="Ej. Baño"
                      value={label}
                      onChangeText={setLabel}
                    />
                  </View>
                </View>

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
                            color:
                              category === cat ? "#FF5C9A" : "#9B7A88",
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
                  label={`Añadir Evento`}
                  disabled={
                    !isEventFormValid || createEvent.isPending
                  }
                  onPress={handleSaveEvent}
                />

                <View style={{ marginTop: 20, gap: 8 }}>
                  {events?.map((item) => (
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
                </View>
              </View>
            )}

            {/* ─── Diaper Observations Tab ─── */}
            {activeTab === "diapers" && (
              <>
                {/* Pee/Poop config card */}
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <PeePoopConfig
                    peeScale={peeScale}
                    setPeeScale={setPeeScale}
                    peeZones={peeZones}
                    setPeeZones={setPeeZones}
                  />
                  <View style={{ marginTop: 12 }}>
                    <BigButton label="💾 Guardar Config. Pipí" onPress={() => {}} />
                  </View>
                </View>

                {/* Observations list */}
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 20,
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
                      style={{
                        fontWeight: "800",
                        fontSize: 13,
                        color: "#9B7A88",
                        textTransform: "uppercase",
                      }}
                    >
                      Observaciones ({diaperObs?.length || 0})
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowForm(true)}
                      style={{
                        backgroundColor: "#FF8AB3",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 99,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFF",
                          fontWeight: "800",
                          fontSize: 12,
                        }}
                      >
                        + Nueva
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ gap: 8 }}>
                    {diaperObs?.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setEditingObs(item)}
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
                            flex: 1,
                          }}
                        >
                          <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: "800",
                                color: "#2D1B26",
                              }}
                            >
                              {item.label}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#9B7A88",
                                fontWeight: "600",
                              }}
                            >
                              {item.scaleMin != null
                                ? `Escala ${item.scaleMin}-${item.scaleMax}`
                                : "Sin escala"}
                            </Text>
                          </View>
                          <Text style={{ color: "#9B7A88", fontSize: 14 }}>
                            ✏️
                          </Text>
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
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
