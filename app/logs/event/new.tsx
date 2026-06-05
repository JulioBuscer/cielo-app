import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import {
  useActiveFeedingSession,
  usePauseFeeding,
} from "@/src/hooks/useFeedingSessions";
import {
  useSaveTimelineEvent,
} from "@/src/hooks/useTimeline";
import { useCatalogItems } from "@/src/hooks/useCatalogItems";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { useTheme } from "@/src/theme/useTheme";
import type { EventMetric } from "@/src/units/types";
import { getUnit, getUnitsForMetric } from "@/src/units/registry";
import { findBestUnit } from "@/src/units/helpers";
import { getCategoryLabel, getCategoryEmoji, USER_CATEGORIES } from "@/src/utils/categories";

const MEDICAL_KEYS = new Set(["medication", "temperature", "vomit"]);

type Step = "category" | "root" | "child" | "form";

export default function EventNewScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const params = useLocalSearchParams<{
    preselect?: string;
    presetValues?: string;
    presetUnitOverrides?: string;
    presetNotes?: string;
    presetName?: string;
    presetEmoji?: string;
    presetTags?: string;
  }>();
  const preselect = params.preselect;
  const presetValuesRaw = params.presetValues;
  const presetUnitOverridesRaw = params.presetUnitOverrides;
  const presetNotesVal = params.presetNotes;
  const presetName = params.presetName;
  const presetEmoji = params.presetEmoji;
  const presetTagsRaw = params.presetTags;
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: allItems } = useCatalogItems();
  const { data: activeFeeding } = useActiveFeedingSession(baby?.id);
  const pauseFeeding = usePauseFeeding();
  const saveEvent = useSaveTimelineEvent();

  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [notes, setNotes] = useState(presetNotesVal ?? "");
  const [timestamp, setTimestamp] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!presetValuesRaw) return {};
    try { const p = JSON.parse(presetValuesRaw); return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])); } catch { return {}; }
  });
  const [displayUnits, setDisplayUnits] = useState<Record<string, string>>(() => {
    if (!presetUnitOverridesRaw) return {};
    try { return JSON.parse(presetUnitOverridesRaw); } catch { return {}; }
  });
  const [tags, setTags] = useState<string[]>(() => {
    if (!presetTagsRaw) return [];
    try { return JSON.parse(presetTagsRaw); } catch { return []; }
  });

  // Derived: the selected item (root or child)
  const selectedItem = useMemo(() => {
    if (!allItems || !selectedItemId) return null;
    return allItems.find((i) => i.id === selectedItemId) ?? null;
  }, [allItems, selectedItemId]);

  const selectedRootItem = useMemo(() => {
    if (!allItems || !selectedRootId) return null;
    return allItems.find((i) => i.id === selectedRootId) ?? null;
  }, [allItems, selectedRootId]);

  // Check if a root item has children
  const itemHasChildren = (id: string) => allItems?.some((i) => i.parentId === id) ?? false;

  const childrenOf = (parentId: string) =>
    allItems?.filter((i) => i.parentId === parentId) ?? [];

  // Metrics from the selected item
  const metrics: EventMetric[] = useMemo(() => {
    if (!selectedItem) return [];
    try { const p = JSON.parse(selectedItem.metrics ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
  }, [selectedItem]);

  // Auto-detect display units
  useEffect(() => {
    for (const m of metrics) {
      const u = getUnit(m.unitId);
      if (!u || u.dimension === 'dimensionless') continue;
      const refValue = m.scaleMax ?? m.scaleMin ?? 100;
      const baseValue = u.toBase(refValue);
      const best = findBestUnit(baseValue, u.dimension);
      if (best.unit.id !== m.unitId) {
        setDisplayUnits((prev) => {
          if (prev[m.id]) return prev;
          return { ...prev, [m.id]: best.unit.id };
        });
      }
    }
  }, [metrics]);

  // Is the selected root medical?
  const isMedical = selectedRootId ? MEDICAL_KEYS.has(selectedRootId) : false;

  // Build category → root items map
  const catRoots = useMemo(() => {
    if (!allItems) return {};
    const map: Record<string, typeof allItems> = {};
    for (const item of allItems) {
      if (item.parentId) continue;
      if (item.id === "diaper" || item.id === "note") continue;
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [allItems]);

  // Build item name lookup for display
  const itemLabel = (id: string) => {
    const item = allItems?.find((i) => i.id === id);
    return item ? `${item.emoji ?? ""} ${item.name}` : id;
  };

  // Handle preselect on mount
  useEffect(() => {
    if (preselect && allItems) {
      const item = allItems.find((i) => i.id === preselect);
      if (item) {
        setSelectedCategory(item.category);
        if (item.parentId) {
          // It's a child item
          const root = allItems.find((i) => i.id === item.parentId);
          if (root) setSelectedRootId(root.id);
          setSelectedItemId(item.id);
        } else {
          setSelectedRootId(item.id);
          setSelectedItemId(item.id);
        }
        setStep("form");
      }
    }
  }, [preselect, allItems]);

  const handleSave = async () => {
    if (!baby || !profile || !selectedItem || !selectedRootId) return;
    setSaving(true);
    try {
      if (activeFeeding && activeFeeding.status === "active" && isMedical) {
        await pauseFeeding.mutateAsync(activeFeeding);
      }

      const numericValues: Record<string, number> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v !== "") {
          const num = parseFloat(v);
          if (!isNaN(num)) {
            const mDef = metrics.find((m) => m.id === k);
            const displayUnitId = displayUnits[k] ?? mDef?.unitId;
            if (displayUnitId && mDef && displayUnitId !== mDef.unitId) {
              const displayU = getUnit(displayUnitId);
              const defaultU = getUnit(mDef.unitId);
              if (displayU && defaultU) {
                const inBase = displayU.toBase(num);
                numericValues[k] = defaultU.fromBase(inBase);
              } else {
                numericValues[k] = num;
              }
            } else {
              numericValues[k] = num;
            }
          }
        }
      }

      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: selectedRootId,
        eventItemId: selectedItemId,
        notes: notes.trim() || undefined,
        timestamp,
        feedingSessionId: activeFeeding?.id,
        values: Object.keys(numericValues).length > 0 ? numericValues : undefined,
        metadata: tags.length > 0 ? {
          tags,
          ...(presetName && { presetName, presetEmoji }),
        } : undefined,
      });

      router.back();
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar el evento");
    } finally {
      setSaving(false);
    }
  };

  const resetSelection = () => {
    setStep("category");
    setSelectedCategory(null);
    setSelectedRootId(null);
    setSelectedItemId(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg ?? c.surface} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: c.headerBg ?? c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.elevated,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24, color: c.textBody }}>✕</Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "900",
            color: c.textBody,
          }}
        >
          📝 Nuevo Evento
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Pick category */}
        {step === "category" && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: c.accent, fontWeight: "800", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
              Seleccionar categoría
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {USER_CATEGORIES.map((catDef) => {
                const count = catRoots[catDef.id]?.length ?? 0;
                if (count === 0) return null;
                return (
                  <TouchableOpacity
                    key={catDef.id}
                    onPress={() => {
                      setSelectedCategory(catDef.id);
                      setStep("root");
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      borderRadius: 99,
                      backgroundColor: c.elevated,
                      minHeight: 52,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{getCategoryEmoji(catDef.id)}</Text>
                    <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 15 }}>
                      {getCategoryLabel(catDef.id)}
                    </Text>
                    <Text style={{ color: c.textDim, fontSize: 13, marginLeft: 4 }}>
                      ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 2: Pick root item (and optionally child) */}
        {(step === "root" || step === "child") && selectedCategory && (
          <View style={{ gap: 16 }}>
            {/* Back to categories */}
            {step === "root" && (
              <TouchableOpacity onPress={resetSelection} style={{ alignSelf: "flex-start" }}>
                <Text style={{ color: c.accent, fontWeight: "600", fontSize: 14 }}>← Categorías</Text>
              </TouchableOpacity>
            )}
            {step === "child" && selectedRootItem && (
              <TouchableOpacity onPress={() => { setStep("root"); setSelectedRootId(null); }} style={{ alignSelf: "flex-start" }}>
                <Text style={{ color: c.accent, fontWeight: "600", fontSize: 14 }}>← {itemLabel(selectedRootId!)}</Text>
              </TouchableOpacity>
            )}

            <Text style={{ color: c.accent, fontWeight: "800", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
              {step === "root"
                ? `${getCategoryEmoji(selectedCategory)} ${getCategoryLabel(selectedCategory)}`
                : `Ítems en ${itemLabel(selectedRootId!)}`}
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(step === "root"
                ? (catRoots[selectedCategory] ?? [])
                : childrenOf(selectedRootId!)
              ).map((item) => {
                const hasChildren = itemHasChildren(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (hasChildren) {
                        setSelectedRootId(item.id);
                        setStep("child");
                      } else {
                        setSelectedRootId(item.id);
                        setSelectedItemId(item.id);
                        setStep("form");
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRadius: 99,
                      backgroundColor: c.elevated,
                      minHeight: 48,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                    <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 14 }}>
                      {item.name}
                    </Text>
                    {hasChildren && (
                      <Text style={{ color: c.textDim, fontSize: 12, marginLeft: 4 }}>
                        ▶
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 3: Form */}
        {step === "form" && selectedItem && selectedRootItem && (
          <>
            {/* Selected item indicator */}
            <TouchableOpacity onPress={resetSelection}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: c.accent,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 99,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ fontSize: 16 }}>{selectedItem.emoji}</Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>
                  {selectedItem.name}
                </Text>
                {selectedItem.id !== selectedRootId && (
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                    ({selectedRootItem.emoji} {selectedRootItem.name})
                  </Text>
                )}
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>✕</Text>
              </View>
            </TouchableOpacity>

            {presetName && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: -8 }}>
                <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "600" }}>
                  Desde plantilla: {presetEmoji ?? ""} {presetName}
                </Text>
              </View>
            )}

            {/* Notes */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
                📝 Notas
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Agregar nota..."
                placeholderTextColor={c.textDim}
                multiline
                style={{
                  backgroundColor: c.elevated,
                  borderRadius: 12,
                  padding: 16,
                  color: c.textBody,
                  fontSize: 15,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {tags.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
                  🏷️ Etiquetas
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {tags.map((t, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setTags(tags.filter((_, j) => j !== i))}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        backgroundColor: c.elevated, borderRadius: 99,
                        paddingVertical: 4, paddingHorizontal: 10,
                      }}
                    >
                      <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13 }}>{t}</Text>
                      <Text style={{ color: c.textDim, fontSize: 11 }}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ color: c.textDim, fontSize: 11 }}>Toca para eliminar</Text>
              </View>
            )}

            {/* Metrics */}
            {metrics.length > 0 && (
              <View style={{ gap: 12 }}>
                <Text style={{ color: c.accent, fontWeight: "800", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
                  📐 Mediciones
                </Text>
                {metrics.map((m) => {
                  const u = getUnit(m.unitId);
                  const compatible = getUnitsForMetric(m);
                  const displayUnitId = displayUnits[m.id] ?? m.unitId;
                  const displayUnit = getUnit(displayUnitId) ?? u;
                  const cycleUnit = () => {
                    const idx = compatible.findIndex((cu) => cu.id === displayUnitId);
                    const nextUnit = compatible[(idx + 1) % compatible.length];
                    if (!nextUnit) return;
                    const curUnit = getUnit(displayUnitId)!;
                    setDisplayUnits((prev) => ({ ...prev, [m.id]: nextUnit.id }));
                    setValues((prev) => {
                      const raw = prev[m.id];
                      if (!raw || raw === "") return prev;
                      const num = parseFloat(raw);
                      if (isNaN(num)) return prev;
                      const inBase = curUnit.toBase(num);
                      const newVal = nextUnit.fromBase(inBase);
                      return { ...prev, [m.id]: String(newVal) };
                    });
                  };

                  return (
                    <View key={m.id} style={{ gap: 4 }}>
                      <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
                        {m.name}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <TextInput
                          value={values[m.id] ?? ""}
                          onChangeText={(v) => setValues((prev) => ({ ...prev, [m.id]: v }))}
                          placeholder="0"
                          placeholderTextColor={c.textDim}
                          keyboardType="numeric"
                          style={{
                            flex: 1,
                            backgroundColor: c.elevated,
                            borderRadius: 12,
                            padding: 16,
                            color: c.textBody,
                            fontSize: 16,
                            minHeight: 48,
                          }}
                        />
                        {compatible.length > 1 && (
                          <TouchableOpacity
                            onPress={cycleUnit}
                            style={{
                              backgroundColor: c.elevated,
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 16,
                              minHeight: 48,
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ color: c.accent, fontWeight: "800", fontSize: 14 }}>
                              {displayUnit?.symbol || displayUnitId}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Date & Time */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
                🕐 Fecha y hora
              </Text>
              <DateTimePicker value={timestamp} onChange={setTimestamp} />
            </View>

            {/* Medical warning */}
            {isMedical && (
              <View style={{ backgroundColor: c.danger + "20", borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: c.danger }}>
                <Text style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}>
                  ⚠️ Esto pausará la toma activa para registrar el evento médico
                </Text>
              </View>
            )}

            <BigButton
              title={saving ? "Guardando..." : "💾 Guardar Evento"}
              onPress={handleSave}
              disabled={saving}
              variant="primary"
            />

            <TouchableOpacity onPress={resetSelection} style={{ minHeight: 48, justifyContent: "center" }}>
              <Text style={{ color: c.textDim, textAlign: "center", fontWeight: "600", fontSize: 14 }}>
                Cambiar tipo de evento
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
