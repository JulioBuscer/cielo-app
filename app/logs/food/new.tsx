import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  useFoodCatalog, FOOD_GROUPS, SUBGROUPS, BADGE_FILTERS, useCreateFoodCatalogItem, useSaveFoodLog,
} from "@/src/hooks/useFoodLogs";
import { useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { FoodDetailModal } from "@/src/components/food/FoodDetailModal";

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
  const { mutateAsync: createFood } = useCreateFoodCatalogItem();
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
      const id = await createFood({
        name: name.trim(),
        emoji,
        group,
        allergens,
      });
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
  const saveEvent = useSaveTimelineEvent();
  const saveFoodLog = useSaveFoodLog();
  const { theme } = useTheme();
  const c = theme.colors;

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
  const [selectedBadgeFilters, setSelectedBadgeFilters] = useState<string[]>([]);
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([]);
  const [timestamp, setTimestamp] = useState(new Date());
  const [isFirst, setIsFirst] = useState(false);
  const [reaction, setReaction] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<TextInput>(null);
  const [detailFood, setDetailFood] = useState<any>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 300);
  }, []);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const toggleSubgroup = (sg: string) => {
    setSelectedSubgroups((prev) =>
      prev.includes(sg) ? prev.filter((x) => x !== sg) : [...prev, sg]
    );
  };
  const toggleBadgeFilter = (bf: string) => {
    setSelectedBadgeFilters((prev) =>
      prev.includes(bf) ? prev.filter((x) => x !== bf) : [...prev, bf]
    );
  };

  const groupedFoods = useMemo(() => {
    const all = catalog ?? [];
    const q = searchQuery.toLowerCase().trim();
    const visible = all.filter((f: any) => !f.hidden);
    const groups: Record<string, any[]> = {};
    for (const f of visible) {
      if (q && !f.name.toLowerCase().includes(q) && !(f.emoji ?? "").includes(q)) continue;
      if (selectedGroup && f.group !== selectedGroup) continue;
      if (selectedSubgroups.length > 0 && (!f.subgroup || !selectedSubgroups.includes(f.subgroup))) continue;
      if (selectedBadgeFilters.length > 0 && !selectedBadgeFilters.some((bf) => BADGE_FILTERS.find((b) => b.key === bf)?.test(f))) continue;
      const g = f.group || "other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }
    return groups;
  }, [catalog, searchQuery, selectedGroup, selectedSubgroups, selectedBadgeFilters]);

  const availableSubgroups = useMemo(() => {
    const all = catalog ?? [];
    const q = searchQuery.toLowerCase().trim();
    const visible = all.filter((f: any) => !f.hidden && (!selectedGroup || f.group === selectedGroup));
    const sgs = new Set<string>();
    for (const f of visible) {
      if (q && !f.name.toLowerCase().includes(q) && !(f.emoji ?? "").includes(q)) continue;
      if (f.subgroup) sgs.add(f.subgroup);
    }
    return [...sgs] as string[];
  }, [catalog, searchQuery, selectedGroup]);

  const toggleFood = (id: string) => {
    setSelectedFoodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  async function handleSave() {
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
          reaction,
          photoUri: photoUris.length > 0 ? photoUris[0] : undefined,
          notes,
        });
      }
      const foods = catalog?.filter((f) => selectedFoodIds.includes(f.id)) ?? [];
      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "food",
        timestamp,
        metadata: {
          foods: foods.map((f) => ({ id: f.id, emoji: f.emoji, name: f.name })),
          isFirst,
          reaction: reaction.trim() || undefined,
          imageUri: photoUris.length > 0 ? photoUris[0] : undefined,
        },
        notes: notes.trim() || undefined,
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
        contentContainerStyle={{ padding: 16, gap: 12 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 13, color: c.textMuted }}>
          ¿Qué comió hoy {baby?.name ?? ""}?
        </Text>

        {/* Search */}
        <TextInput
          ref={searchRef}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 Buscar alimento…"
          placeholderTextColor={c.textDim}
          style={{
            backgroundColor: c.elevated, color: c.textBody,
            padding: 10, borderRadius: 10, fontSize: 14,
            borderWidth: 1, borderColor: c.border,
          }}
        />

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: c.textMuted, letterSpacing: 0.5 }}>GRUPO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
            {GROUP_KEYS.map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => setSelectedGroup(selectedGroup === k ? null : k)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                  backgroundColor: selectedGroup === k ? c.accent : c.card,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: "600",
                  color: selectedGroup === k ? c.textOnAccent : c.textBody,
                }}>{FOOD_GROUPS[k]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {availableSubgroups.length > 0 && (
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: c.textMuted, letterSpacing: 0.5 }}>SUBGRUPO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
              {availableSubgroups.map((sg) => (
                <TouchableOpacity
                  key={sg}
                  onPress={() => toggleSubgroup(sg)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                    backgroundColor: selectedSubgroups.includes(sg) ? c.accent : c.card,
                  }}
                >
                  <Text style={{
                    fontSize: 12, fontWeight: "600",
                    color: selectedSubgroups.includes(sg) ? c.textOnAccent : c.textBody,
                  }}>{SUBGROUPS[sg] ?? sg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: c.textMuted, letterSpacing: 0.5 }}>BADGE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
            {BADGE_FILTERS.map((bf) => (
              <TouchableOpacity
                key={bf.key}
                onPress={() => toggleBadgeFilter(bf.key)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                  backgroundColor: selectedBadgeFilters.includes(bf.key) ? c.accent : c.card,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: "600",
                  color: selectedBadgeFilters.includes(bf.key) ? c.textOnAccent : c.textBody,
                }}>{bf.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
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
          {Object.entries(groupedFoods).map(([group, foods]) => {
            const isCollapsed = collapsedGroups[group] ?? false;
            const grpLabel = (FOOD_GROUPS as any)[group] ?? group;
            return (
            <View key={group} style={{ marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => toggleGroup(group)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingVertical: 6, paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 12, color: c.textMuted }}>
                  {isCollapsed ? "▶" : "▼"}
                </Text>
                <Text style={{
                  fontSize: 14, fontWeight: "700", color: c.textBody,
                }}>
                  {grpLabel}
                </Text>
                <Text style={{ fontSize: 12, color: c.textMuted }}>
                  ({foods.length})
                </Text>
              </TouchableOpacity>
              {!isCollapsed && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, paddingLeft: 16 }}>
                {foods.map((f: any) => {
                  const selected = selectedFoodIds.includes(f.id);
                  return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => toggleFood(f.id)}
                    onLongPress={() => setDetailFood(f)}
                    style={{
                      borderRadius: 10,
                      backgroundColor: selected ? c.accent : c.elevated,
                      borderWidth: 1,
                      borderColor: selected ? c.accent : c.border,
                    }}
                  >
                    {!selected && (f.isAllergen || f.warning || f.effect || f.subgroup) && (
                      <View style={{
                        alignSelf: "flex-start",
                        flexDirection: "row", gap: 2,
                        padding: 2,
                        borderTopLeftRadius: 99, borderTopRightRadius: 99,
                      }}>
                        {f.isAllergen && (
                          <View style={{ borderRadius: 99, paddingHorizontal: 2 }}>
                            <Text style={{ fontSize: 11 }}>🚨</Text>
                          </View>
                        )}
                        {f.warning && (
                          <View style={{ borderRadius: 99, paddingHorizontal: 2 }}>
                            <Text style={{ fontSize: 11 }}>⚠️</Text>
                          </View>
                        )}
                        {f.subgroup && (
                          <View style={{ borderRadius: 99, paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, color: c.textMuted }}>{SUBGROUPS[f.subgroup]?.split(" ")[0] ?? ""}</Text>
                          </View>
                        )}
                        {f.effect === "laxative" && (
                          <View style={{ backgroundColor: "#E8F5E9", borderRadius: 99, paddingHorizontal: 2 }}>
                            <Text style={{ fontSize: 11 }}>🟢</Text>
                          </View>
                        )}
                        {f.effect === "astringent" && (
                          <View style={{ backgroundColor: "#EFEBE9", borderRadius: 99, paddingHorizontal: 2 }}>
                            <Text style={{ fontSize: 11 }}>🟤</Text>
                          </View>
                        )}
                        {f.effect === "regulator" && (
                          <View style={{ backgroundColor: "#E3F2FD", borderRadius: 99, paddingHorizontal: 2 }}>
                            <Text style={{ fontSize: 11 }}>🔄</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{
                        fontSize: 13, textAlign: "left",
                        color: selected ? c.textOnAccent : c.textBody,
                      }}>
                        {f.emoji ?? ""} {f.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
                })}
              </View>
              )}
            </View>
            );
          })}
        </View>

        <DateTimePicker value={timestamp} onChange={setTimestamp} />

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
            {isFirst && <Text style={{ color: c.textOnAccent, fontSize: 13 }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 14, color: c.textBody }}>🥇 Primera vez que prueba este alimento</Text>
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
          disabled={saving || selectedFoodIds.length === 0}
        />
      </ScrollView>
      </KeyboardAvoidingView>

      <QuickAddModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdded={(id) => {
          setSelectedFoodIds((prev) => prev.includes(id) ? prev : [...prev, id]);
          setShowQuickAdd(false);
        }}
      />
      <FoodDetailModal food={detailFood} visible={!!detailFood} onClose={() => setDetailFood(null)} />
    </SafeAreaView>
  );
}
