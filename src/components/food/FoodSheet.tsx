import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  Platform, Alert, Image, ScrollView,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { BigButton } from "@/src/components/ui/BigButton";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { FoodDetailModal } from "@/src/components/food/FoodDetailModal";
import { FoodGridCard } from "@/src/components/food/FoodGridCard";
import { useActiveBaby } from "@/src/hooks/useBaby";
import {
  useFoodCatalog,
  FOOD_GROUPS,
  SUBGROUPS,
  BADGE_FILTERS,
  useSaveFoodLog,
  useBabyFoodConsumed,
} from "@/src/hooks/useFoodLogs";
import { useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { useCamera } from "@/src/hooks/useCamera";
import { useDebounce } from "@/src/hooks/useDebounce";

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
  const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
  const [selectedBadgeFilters, setSelectedBadgeFilters] = useState<string[]>([]);
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([]);
  const [detailFood, setDetailFood] = useState<any>(null);
  const [timestamp, setTimestamp] = useState(new Date());
  const [isFirst, setIsFirst] = useState(false);
  const [reaction, setReaction] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: consumed } = useBabyFoodConsumed(baby?.id);
  const debouncedSearch = useDebounce(searchQuery, 250);
  const searchRef = useRef<TextInput>(null);

  const groupFiltered = useMemo(() =>
    catalog?.filter(
      (f) => !selectedGroup || f.group === selectedGroup || (f.secondaryGroups && f.secondaryGroups.split(",").includes(selectedGroup))
    ) ?? []
  , [catalog, selectedGroup]);

  const badgeFiltered = useMemo(() =>
    selectedBadgeFilters.length > 0
      ? groupFiltered.filter((f) => selectedBadgeFilters.some((bf) => BADGE_FILTERS.find((b) => b.key === bf)?.test(f)))
      : groupFiltered
  , [groupFiltered, selectedBadgeFilters]);

  const filtered = useMemo(() =>
    (selectedSubgroups.length > 0
      ? badgeFiltered.filter((f) => f.subgroup && selectedSubgroups.includes(f.subgroup))
      : badgeFiltered)
      .filter((f) => {
        if (!debouncedSearch.trim()) return true;
        const q = debouncedSearch.toLowerCase().trim();
        return f.name.toLowerCase().includes(q) || (f.emoji ?? "").includes(q);
      })
  , [badgeFiltered, selectedSubgroups, debouncedSearch]);

  const availableSubgroups = useMemo(() =>
    [...new Set(groupFiltered.map((f) => f.subgroup).filter(Boolean))] as string[]
  , [groupFiltered]);

  const toggleSubgroup = useCallback((sg: string) => {
    setSelectedSubgroups((prev) =>
      prev.includes(sg) ? prev.filter((x) => x !== sg) : [...prev, sg]
    );
  }, []);

  const toggleBadgeFilter = useCallback((bf: string) => {
    setSelectedBadgeFilters((prev) =>
      prev.includes(bf) ? prev.filter((x) => x !== bf) : [...prev, bf]
    );
  }, []);

  const toggleFood = useCallback((id: string) => {
    setSelectedFoodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  useEffect(() => {
    if (visible) {
      setSelectedGroup(null);
      setSelectedSubgroups([]);
      setSelectedBadgeFilters([]);
      setSelectedFoodIds([]);
      setDetailFood(null);
      setTimestamp(new Date());
      setIsFirst(false);
      setReaction("");
      setNotes("");
      setAdvanced(false);
      setShowDetails(false);
      setImageUri(null);
      setSearchQuery("");
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!baby || selectedFoodIds.length === 0) {
      Alert.alert("Selecciona al menos un alimento");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(selectedFoodIds.map((foodId) =>
        saveFoodLog.mutateAsync({
          babyId: baby.id,
          foodId,
          timestamp,
          isFirst,
          reaction: reaction.trim() || undefined,
          photoUri: imageUri ?? undefined,
          notes: notes.trim() || undefined,
        })
      ));
      const foods = catalog?.filter((f) => selectedFoodIds.includes(f.id)) ?? [];
      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "food",
        timestamp,
        metadata: {
          foods: foods.map((f) => ({ id: f.id, emoji: f.emoji, name: f.name })),
          isFirst,
          reaction: reaction.trim() || undefined,
          imageUri: imageUri ?? undefined,
        },
        notes: notes.trim() || undefined,
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

  return (<>
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
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 0 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ fontSize: 36 }}>🍽️</Text>
              <Text style={{ color: c.textBody, fontSize: 18, fontWeight: "800" }}>Alimentación</Text>
            </View>

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

            {availableSubgroups.length > 0 && (
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
            )}

            <View style={{ flexDirection: "row", backgroundColor: c.card, borderRadius: 10, padding: 2 }}>
              {(["simple", "advanced"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setAdvanced(mode === "advanced")}
                  style={{
                    flex: 1, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: (mode === "advanced") === advanced ? c.accent : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text style={{
                    fontSize: 12, fontWeight: "700",
                    color: (mode === "advanced") === advanced ? c.textOnAccent : c.textMuted,
                  }}>
                    {mode === "simple" ? "🙂 Simple" : "🔬 Avanzada"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filtered.length === 0 ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ color: c.textMuted, fontSize: 14 }}>No hay alimentos</Text>
              </View>
            ) : (
              (() => {
                const grouped: Record<string, typeof filtered> = {};
                for (const f of filtered) {
                  const g = f.group || "other";
                  if (!grouped[g]) grouped[g] = [];
                  grouped[g].push(f);
                }
                return Object.entries(grouped).map(([group, foods]) => {
                  const grpLabel = (FOOD_GROUPS as any)[group] ?? group;
                  const emoji = grpLabel.split(" ")[0];
                  const label = grpLabel.split(" ").slice(1).join(" ");
                  return (
                    <View key={group}>
                      <Text style={{
                        fontSize: 13, fontWeight: "700", color: c.textBody, marginBottom: 4,
                      }}>
                        {emoji} {label}
                        <Text style={{ color: c.textMuted, fontWeight: "400" }}> ({foods.length})</Text>
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
                        {foods.map((f: any) => (
                          <View key={f.id} style={{ width: "33.33%", padding: 4 }}>
                            <FoodGridCard
                              food={f}
                              selected={selectedFoodIds.includes(f.id)}
                              consumed={consumed?.has(f.id) ?? false}
                              onPress={() => toggleFood(f.id)}
                              onLongPress={() => setDetailFood(f)}
                              colors={c}
                              advanced={advanced}
                            />
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                });
              })()
            )}

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

                {/* Selected foods info */}
                {selectedFoodIds.length > 0 && (
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 12 }}>Información de alimentos seleccionados</Text>
                    {filtered.filter((f) => selectedFoodIds.includes(f.id)).map((f) => (
                      <TouchableOpacity key={f.id} onLongPress={() => setDetailFood(f)} style={{
                        flexDirection: "row", alignItems: "center", gap: 6,
                        paddingVertical: 4, paddingHorizontal: 8,
                        backgroundColor: c.elevated, borderRadius: 8,
                      }}>
                        <Text style={{ fontSize: 13 }}>{f.emoji ?? ""} {f.name}</Text>
                        {f.isAllergen && <Text style={{ fontSize: 11, color: "#E53935" }}>🚨</Text>}
                        {f.effect === "laxative" && <Text style={{ fontSize: 10, color: "#2E7D32" }}>🟢</Text>}
                        {f.effect === "astringent" && <Text style={{ fontSize: 10, color: "#5D4037" }}>🟤</Text>}
                        {f.effect === "regulator" && <Text style={{ fontSize: 10 }}>🔄</Text>}
                        {f.warning && <Text style={{ fontSize: 10, color: "#E65100" }}>⚠️</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

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
    <FoodDetailModal food={detailFood} visible={!!detailFood} onClose={() => setDetailFood(null)} />
  </>);
}
