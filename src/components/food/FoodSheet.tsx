import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { BigButton } from "@/src/components/ui/BigButton";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { useActiveBaby } from "@/src/hooks/useBaby";
import {
  useFoodCatalog,
  FOOD_GROUPS,
  useSaveFoodLog,
} from "@/src/hooks/useFoodLogs";
import { useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { useCamera } from "@/src/hooks/useCamera";

const GROUP_KEYS = Object.keys(FOOD_GROUPS).sort();

export function FoodSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const { data: catalog } = useFoodCatalog();
  const saveEvent = useSaveTimelineEvent();
  const saveFoodLog = useSaveFoodLog();
  const { takePhoto, pickImage } = useCamera();

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([]);
  const [timestamp, setTimestamp] = useState(new Date());
  const [isFirst, setIsFirst] = useState(false);
  const [reaction, setReaction] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const filtered = catalog?.filter(
    (f) => !selectedGroup || f.group === selectedGroup
  ) ?? [];

  const toggleFood = (id: string) => {
    setSelectedFoodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (visible) {
      setSelectedGroup(null);
      setSelectedFoodIds([]);
      setTimestamp(new Date());
      setIsFirst(false);
      setReaction("");
      setNotes("");
      setShowDetails(false);
      setImageUri(null);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!baby || selectedFoodIds.length === 0) {
      Alert.alert("Selecciona al menos un alimento");
      return;
    }
    setSaving(true);
    try {
      for (const foodId of selectedFoodIds) {
        await saveFoodLog.mutateAsync({
          babyId: baby.id,
          foodId,
          timestamp,
          isFirst,
          reaction: reaction.trim() || undefined,
          photoUri: imageUri ?? undefined,
          notes: notes.trim() || undefined,
        });
      }
      const foods = catalog?.filter((f) => selectedFoodIds.includes(f.id)) ?? [];
      const foodList = foods.map((f) => `${f.emoji ?? ""} ${f.name}`).join(", ");
      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "note",
        timestamp,
        notes: `🍽️ ${foodList}${isFirst ? " (primera vez)" : ""}${reaction ? ` — ${reaction}` : ""}`,
      });
      onClose();
    } catch {
      Alert.alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleImage = () => {
    Alert.alert("Foto de comida", "¿Cómo quieres agregar una foto?", [
      {
        text: "📷 Cámara",
        onPress: async () => {
          const uri = await takePhoto();
          if (uri) setImageUri(uri);
        },
      },
      {
        text: "🖼️ Galería",
        onPress: async () => {
          const uri = await pickImage();
          if (uri) setImageUri(uri);
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "80%",
            paddingBottom: Platform.OS === "ios" ? 20 : 8,
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 0 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 40 }}>🍽️</Text>
              <Text style={{ color: c.textBody, fontSize: 20, fontWeight: "800" }}>Alimentación</Text>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <TouchableOpacity
                onPress={() => setSelectedGroup(null)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: !selectedGroup ? c.accent : c.card,
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: "600",
                  color: !selectedGroup ? c.textOnAccent : c.textBody,
                }}>Todos</Text>
              </TouchableOpacity>
              {GROUP_KEYS.map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setSelectedGroup(k)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: selectedGroup === k ? c.accent : c.card,
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: "600",
                    color: selectedGroup === k ? c.textOnAccent : c.textBody,
                  }}>{FOOD_GROUPS[k]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {filtered.map((f) => {
                const selected = selectedFoodIds.includes(f.id);
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => toggleFood(f.id)}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
                      backgroundColor: selected ? c.accent : c.card,
                      borderWidth: 1,
                      borderColor: selected ? c.accent : c.border,
                    }}
                  >
                    <View style={{
                      width: 18, height: 18, borderRadius: 4, borderWidth: 2,
                      borderColor: selected ? c.textOnAccent : c.textMuted,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: selected ? c.textOnAccent : "transparent",
                    }}>
                      {selected && <Text style={{ color: c.accent, fontSize: 10, fontWeight: "900" }}>✓</Text>}
                    </View>
                    <Text style={{
                      fontSize: 14,
                      color: selected ? c.textOnAccent : c.textBody,
                    }}>
                      {f.emoji ?? ""} {f.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setShowDetails(!showDetails)}
              style={{ alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={{ color: c.accentStrong, fontWeight: "700", fontSize: 15 }}>
                {showDetails ? "📋 Menos detalles ▴" : "📋 Más detalles ▾"}
              </Text>
            </TouchableOpacity>

            {showDetails && (
              <>
                <TouchableOpacity
                  onPress={() => setIsFirst(!isFirst)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
                >
                  <View style={{
                    width: 22, height: 22, borderRadius: 4, borderWidth: 2,
                    borderColor: c.accent,
                    backgroundColor: isFirst ? c.accent : "transparent",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {isFirst && <Text style={{ color: c.textOnAccent, fontSize: 12 }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 14, color: c.textBody }}>🥇 Primera vez que prueba</Text>
                </TouchableOpacity>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>Reacción</Text>
                  <TextInput
                    value={reaction}
                    onChangeText={setReaction}
                    placeholder="Ej: le gustó mucho"
                    placeholderTextColor={c.textDim}
                    style={{ backgroundColor: c.card, borderRadius: 12, padding: 12, color: c.textBody, fontSize: 15 }}
                  />
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>📸 Foto</Text>
                  {imageUri ? (
                    <View style={{ alignItems: "flex-start", gap: 8 }}>
                      <Image source={{ uri: imageUri }} style={{ width: 120, height: 120, borderRadius: 12 }} resizeMode="cover" />
                      <TouchableOpacity onPress={() => setImageUri(null)}>
                        <Text style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}>Eliminar foto</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleImage}
                      style={{ borderWidth: 2, borderColor: c.card, borderStyle: "dashed", borderRadius: 12, padding: 20, alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 28 }}>📷</Text>
                      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12 }}>Agregar foto</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>🕐 Hora</Text>
                  <DateTimePicker value={timestamp} onChange={setTimestamp} />
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>📝 Notas</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Textura, cantidad, etc."
                    placeholderTextColor={c.textDim}
                    multiline
                    style={{ backgroundColor: c.card, borderRadius: 12, padding: 12, color: c.textBody, fontSize: 15, minHeight: 60, textAlignVertical: "top" }}
                  />
                </View>

                <View style={{ backgroundColor: c.card, borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: c.accent }}>
                  <Text style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}>
                    💡 Al iniciar un alimento nuevo, ofrecerlo solo por 3-4 días antes de introducir otro nuevo (especialmente si contiene alérgenos). (ESPGHAN, AAP)
                  </Text>
                </View>
              </>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
        <View style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: c.surface }}>
          <BigButton
            title={selectedFoodIds.length > 0 ? `Guardar (${selectedFoodIds.length}) 🍽️` : "Selecciona al menos un alimento"}
            onPress={handleSave}
            loading={saving}
            disabled={saving || selectedFoodIds.length === 0}
          />
        </View>
      </View>
    </Modal>
  );
}
