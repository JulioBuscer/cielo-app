import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/src/theme/useTheme";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, Image,
  KeyboardAvoidingView, Platform, Keyboard,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { captureAndStore, deletePhoto } from "@/src/services/imageStorage";
import { useActiveBaby } from "@/src/hooks/useBaby";
import {
  useFoodCatalog, useSaveFoodLog, FOOD_GROUPS,
} from "@/src/hooks/useFoodLogs";
import { useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { getDb } from "@/src/db/client";
import { foodCatalog } from "@/src/db/schema";

const GROUP_KEYS = Object.keys(FOOD_GROUPS).sort();

const ALLERGEN_LIST = [
  { id: 'egg', label: 'Huevo', emoji: '🥚' },
  { id: 'milk', label: 'Leche', emoji: '🥛' },
  { id: 'peanut', label: 'Cacahuate', emoji: '🥜' },
  { id: 'tree_nuts', label: 'Frutos secos', emoji: '🌰' },
  { id: 'fish', label: 'Pescado', emoji: '🐟' },
  { id: 'shellfish', label: 'Mariscos', emoji: '🦐' },
  { id: 'wheat', label: 'Trigo', emoji: '🌾' },
  { id: 'soy', label: 'Soya', emoji: '🫘' },
];

function QuickAddModal({
  visible, onClose, onAdded,
}: {
  visible: boolean; onClose: () => void; onAdded: (id: string) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [name, setName] = useState("");
  const [group, setGroup] = useState("fruit");
  const [emoji, setEmoji] = useState("🍽️");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [keyboardH, setKeyboardH] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => setKeyboardH(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (visible) {
      setKeyboardH(0);
      setName("");
      setEmoji("🍽️");
      setGroup("fruit");
      setAllergens([]);
    }
  }, [visible]);

  if (!visible) return null;

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      const id = name.toLowerCase().replace(/[^a-záéíóúñ]/g, "_");
      getDb().insert(foodCatalog).values({
        id,
        name: name.trim(),
        emoji: emoji || null,
        group: group as any,
        property: "neutral",
        allergens: allergens.length > 0 ? allergens.join(",") : null,
        isSystem: false,
        createdAt: new Date(),
      }).run();
      onAdded(id);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo agregar el alimento");
    }
  };

  return (
    <View style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end", zIndex: 10,
    }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      <View style={{
        backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 24, paddingBottom: keyboardH ? keyboardH + 24 : 24,
        maxHeight: "85%",
      }}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "900", color: c.textBody, textAlign: "center" }}>
            🍽️ Nuevo alimento
          </Text>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Nombre</Text>
            <TextInput
              ref={nameRef}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Espinaca"
              placeholderTextColor={c.textDim}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
              style={{ backgroundColor: c.card, color: c.textBody, padding: 14, borderRadius: 12, fontSize: 15 }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Emoji</Text>
            <TextInput
              value={emoji}
              onChangeText={setEmoji}
              placeholder="🥬"
              placeholderTextColor={c.textDim}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
              style={{ backgroundColor: c.card, color: c.textBody, padding: 14, borderRadius: 12, fontSize: 15 }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Grupo</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {GROUP_KEYS.map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setGroup(k)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                    backgroundColor: group === k ? c.accent : c.card,
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: "600",
                    color: group === k ? c.textOnAccent : c.textBody,
                  }}>
                    {FOOD_GROUPS[k]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>
              🥜 Alérgenos (opcional)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {ALLERGEN_LIST.map((a) => {
                const selected = allergens.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setAllergens((prev) =>
                      prev.includes(a.id)
                        ? prev.filter((x) => x !== a.id)
                        : [...prev, a.id]
                    )}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                      backgroundColor: selected ? c.accent : c.card,
                    }}
                  >
                    <Text style={{
                      fontSize: 13, fontWeight: "600",
                      color: selected ? c.textOnAccent : c.textBody,
                    }}>
                      {a.emoji} {a.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <BigButton title="Agregar" onPress={handleAdd} disabled={!name.trim()} />
        </ScrollView>
      </View>
    </View>
  );
}

export default function FoodLogNewScreen() {
  const { data: baby } = useActiveBaby();
  const { data: catalog } = useFoodCatalog();
  const saveFood = useSaveFoodLog();
  const saveEvent = useSaveTimelineEvent();
  const { theme } = useTheme();
  const c = theme.colors;

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState(new Date());
  const [isFirst, setIsFirst] = useState(false);
  const [reaction, setReaction] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const filtered = catalog?.filter(
    (f) => !selectedGroup || f.group === selectedGroup
  ) ?? [];

  async function handleSave() {
    if (!baby || !selectedFoodId) {
      Alert.alert("Selecciona un alimento");
      return;
    }
    setSaving(true);
    try {
      const food = catalog?.find((f) => f.id === selectedFoodId);
      await saveFood.mutateAsync({
        babyId: baby.id,
        foodId: selectedFoodId,
        timestamp,
        isFirst,
        reaction: reaction || undefined,
        notes: notes || undefined,
        photoUri: photoUris.length > 0 ? photoUris[0] : undefined,
      });
      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "note",
        timestamp,
        notes: `🍽️ ${food?.emoji ?? ""} ${food?.name ?? ""}${isFirst ? " (primera vez)" : ""}${reaction ? ` — ${reaction}` : ""}`,
      });
      router.back();
    } catch {
      Alert.alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const handleTakePhoto = async () => {
    const uri = await captureAndStore();
    if (uri) setPhotoUris((prev) => [...prev, uri]);
  };

  const handlePickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.7, allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoUris((prev) => [...prev, result.assets[0].uri]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <StatusBar barStyle={parseInt(c.surface.replace("#","").slice(0,2),16) > 128 ? "dark-content" : "light-content"} />
      <View style={{
        flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: c.textBody }}>
          🍽️ Alimentación
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 13, color: c.textMuted }}>
          ¿Qué comió hoy {baby?.name ?? ""}?
        </Text>

        <View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginBottom: 8 }}>
            Grupo
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedGroup(null)}
              style={{
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                backgroundColor: !selectedGroup ? c.accent : c.elevated,
              }}
            >
              <Text style={{
                fontSize: 14, fontWeight: "600",
                color: !selectedGroup ? c.textOnAccent : c.textBody,
              }}>Todos</Text>
            </TouchableOpacity>
            {GROUP_KEYS.map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => setSelectedGroup(k)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                  backgroundColor: selectedGroup === k ? c.accent : c.elevated,
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: "600",
                  color: selectedGroup === k ? c.textOnAccent : c.textBody,
                }}>
                  {FOOD_GROUPS[k]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>
              Alimento
            </Text>
            <TouchableOpacity
              onPress={() => setShowQuickAdd(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent }}>+ Nuevo</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filtered.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setSelectedFoodId(f.id)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: selectedFoodId === f.id ? c.accent : c.elevated,
                  borderWidth: 1,
                  borderColor: selectedFoodId === f.id ? c.accent : c.border,
                }}
              >
                <Text style={{
                  fontSize: 15,
                  color: selectedFoodId === f.id ? c.textOnAccent : c.textBody,
                }}>
                  {f.emoji ?? ""} {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <DateTimePicker value={timestamp} onChange={setTimestamp} />

        <TouchableOpacity
          onPress={() => setIsFirst(!isFirst)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}
        >
          <View style={{
            width: 24, height: 24, borderRadius: 4, borderWidth: 2,
            borderColor: c.accent,
            backgroundColor: isFirst ? c.accent : "transparent",
            alignItems: "center", justifyContent: "center",
          }}>
            {isFirst && <Text style={{ color: c.textOnAccent, fontSize: 14 }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 15, color: c.textBody }}>🥇 Primera vez que prueba este alimento</Text>
        </TouchableOpacity>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>📸 Foto (opcional)</Text>
          {photoUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {photoUris.map((uri, i) => (
                <View key={i} style={{ position: "relative" }}>
                  <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => {
                      deletePhoto(uri);
                      setPhotoUris((prev) => prev.filter((u) => u !== uri));
                    }}
                    style={{ position: "absolute", top: -4, right: -4, width: 20, height: 20,
                      borderRadius: 10, backgroundColor: c.danger, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "900" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={handleTakePhoto}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, borderWidth: 1, borderColor: c.elevated }}>
              <Text style={{ fontSize: 18 }}>📷</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody }}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickImage}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, borderWidth: 1, borderColor: c.elevated }}>
              <Text style={{ fontSize: 18 }}>🖼️</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody }}>Galería</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginBottom: 8 }}>
            Reacción (opcional)
          </Text>
          <TextInput
            value={reaction}
            onChangeText={setReaction}
            placeholder="Ej: le gustó mucho, hizo gesto, etc."
            placeholderTextColor={c.textDim}
            style={{ backgroundColor: c.elevated, color: c.textBody, padding: 14, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: c.border }}
          />
        </View>

        <View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginBottom: 8 }}>
            Notas (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Textura, cantidad, etc."
            placeholderTextColor={c.textDim}
            multiline
            style={{ backgroundColor: c.elevated, color: c.textBody, padding: 14, borderRadius: 12, fontSize: 15, minHeight: 80, borderWidth: 1, borderColor: c.border }}
          />
        </View>

        <View style={{
          backgroundColor: c.card, borderRadius: 12, padding: 14,
          borderLeftWidth: 3, borderLeftColor: c.accent,
        }}>
          <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
            💡 Al iniciar un alimento nuevo, se recomienda ofrecerlo solo por 3-4 días antes de introducir otro nuevo (especialmente si contiene alérgenos). Esto ayuda a identificar posibles reacciones. (ESPGHAN, AAP)
          </Text>
        </View>

        <BigButton
          title={saving ? "Guardando…" : "💾 Guardar"}
          onPress={handleSave}
          disabled={saving || !selectedFoodId}
        />
      </ScrollView>
      </KeyboardAvoidingView>

      <QuickAddModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdded={(id) => {
          setSelectedFoodId(id);
          setShowQuickAdd(false);
        }}
      />
    </SafeAreaView>
  );
}
