import { useState, useEffect, useMemo, useCallback } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeJsonParse } from "@/src/utils/safeJsonParse";
import { getCategoryLabel, getCategoryEmoji, USER_CATEGORIES } from "@/src/utils/categories";
import { KEYS } from "@/src/utils/storage";
import { BigButton } from "@/src/components/ui/BigButton";
import {
  useDiaperObservations,
  useCreateDiaperObservation,
  useUpdateDiaperObservation,
  useDeleteDiaperObservation,
} from "@/src/hooks/useTimeline";
import {
  useCatalogItems,
  useRootItems,
  useChildren,
  useCreateCatalogItem,
  useUpdateCatalogItem,
  useDeleteCatalogItem,
} from "@/src/hooks/useCatalogItems";

import { useTheme } from "@/src/theme/useTheme";
import type { DiaperObservation, ObservationMetric, CatalogItem } from "@/src/db/schema";
import type { EventMetric } from "@/src/units/types";
import { getUnit, getUnitsForMetric } from "@/src/units/registry";
import { ItemEditorModal } from "@/src/components/ui/ItemEditorModal";
import { ZoneEditor } from "@/src/components/catalogs/ZoneEditor";
import { EventMetricsEditor } from "@/src/components/catalogs/EventMetricsEditor";
import { ObservationForm } from "@/src/components/catalogs/ObservationForm";
import { IntensitySection } from "@/src/components/catalogs/IntensitySection";
import { HealthSection } from "@/src/components/catalogs/HealthSection";
import { PeeConfigSection } from "@/src/components/catalogs/PeeConfigSection";
import { PoopConfigSection } from "@/src/components/catalogs/PoopConfigSection";
import { ThemeToggle } from "@/src/components/catalogs/ThemeToggle";
import type { Zone, ConfigRange, HealthConfig } from "@/src/components/catalogs/types";

export default function CatalogsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: allItems } = useCatalogItems();
  const { data: diaperObs } = useDiaperObservations();
  const createItem = useCreateCatalogItem();
  const updateItem = useUpdateCatalogItem();
  const deleteItem = useDeleteCatalogItem();
  const createDiaper = useCreateDiaperObservation();
  const updateDiaper = useUpdateDiaperObservation();

  const [activeTab, setActiveTab] = useState<"catalog" | "pee" | "poop" | "obs">("catalog");
  // ─── Catalog tree state ───
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingObs, setEditingObs] = useState<DiaperObservation | null>(null);
  const [showNewObsForm, setShowNewObsForm] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [newChildParentId, setNewChildParentId] = useState<string | null>(null);
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── Item form state ───
  const [itemForm, setItemForm] = useState(false);
  const [itemEdit, setItemEdit] = useState<any>(null); // catalog item being edited
  const [ifName, setIfName] = useState("");
  const [ifEmoji, setIfEmoji] = useState("📌");
  const [ifCategory, setIfCategory] = useState("");
  const [ifParentId, setIfParentId] = useState<string | null>(null);
  const [ifMetricValues, setIfMetricValues] = useState<Record<string, string>>({});
  const [ifMetricUnits, setIfMetricUnits] = useState<Record<string, string>>({});
  const [ifNotes, setIfNotes] = useState("");
  const [ifTags, setIfTags] = useState<string[]>([]);
  const [ifTagInput, setIfTagInput] = useState("");
  const [ifQuick, setIfQuick] = useState(false);
  const [ifMetricsJson, setIfMetricsJson] = useState("[]");

  const editingMetrics: EventMetric[] = (() => {
    try { const p = JSON.parse(ifMetricsJson); return Array.isArray(p) ? p : []; } catch { return []; }
  })();

  const resetItemForm = () => {
    setIfName("");
    setIfEmoji("📌");
    setIfCategory("");
    setIfParentId(null);
    setIfMetricValues({});
    setIfMetricUnits({});
    setIfNotes("");
    setIfTags([]);
    setIfTagInput("");
    setIfQuick(false);
    setIfMetricsJson("[]");
  };

  const openItemForm = (item?: any, parentId?: string | null, category?: string) => {
    if (item) {
      setItemEdit(item);
      setIfName(item.name);
      setIfEmoji(item.emoji ?? "📌");
      setIfCategory(item.category);
      setIfParentId(item.parentId);
      setIfMetricsJson(item.metrics ?? "[]");
      const vals: Record<string, string> = {};
      const units: Record<string, string> = {};
      try {
        const dv = JSON.parse(item.defaultValues ?? "{}");
        for (const [k, v] of Object.entries(dv)) vals[k] = String(v);
      } catch {}
      try {
        const duo = JSON.parse(item.defaultUnitOverrides ?? "{}");
        for (const [k, v] of Object.entries(duo)) units[k] = String(v);
      } catch {}
      setIfMetricValues(vals);
      setIfMetricUnits(units);
      setIfNotes(item.defaultNotes ?? "");
      let tags: string[] = [];
      try { tags = JSON.parse(item.defaultTags ?? '[]'); } catch {}
      setIfTags(tags);
      setIfQuick(item.isQuickAction ?? false);
    } else {
      setItemEdit(null);
      resetItemForm();
      setIfCategory(category ?? "");
      setIfParentId(parentId ?? null);
    }
    setItemForm(true);
  };

  const handleSaveItem = async () => {
    if (!ifName.trim() || !ifCategory) return;
    const dv: Record<string, number> = {};
    for (const [k, v] of Object.entries(ifMetricValues)) {
      const n = parseFloat(v);
      if (!isNaN(n)) dv[k] = n;
    }
    try {
      if (itemEdit) {
        await updateItem.mutateAsync({
          id: itemEdit.id,
          name: ifName.trim(),
          emoji: ifEmoji,
          metrics: JSON.parse(ifMetricsJson),
          defaultValues: dv,
          defaultUnitOverrides: ifMetricUnits,
          defaultNotes: ifNotes || undefined,
          defaultTags: ifTags,
          isQuickAction: ifQuick,
        });
      } else {
        await createItem.mutateAsync({
          category: ifCategory,
          parentId: ifParentId ?? undefined,
          name: ifName.trim(),
          emoji: ifEmoji,
          metrics: JSON.parse(ifMetricsJson),
          defaultValues: dv,
          defaultUnitOverrides: ifMetricUnits,
          defaultNotes: ifNotes || undefined,
          defaultTags: ifTags,
          isQuickAction: ifQuick,
        });
      }
      setItemForm(false);
      setItemEdit(null);
      Alert.alert("✅ Guardado", `"${ifEmoji} ${ifName.trim()}" guardado.`);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar el ítem");
    }
  };

  const handleDeleteItem = (id: string) => {
    const children = allItems?.filter((i) => i.parentId === id) ?? [];
    const hasChildren = children.length > 0;

    Alert.alert(
      hasChildren ? "Eliminar contenedor" : "Eliminar ítem",
      hasChildren
        ? `Este contenedor tiene ${children.length} ${children.length === 1 ? "ítem" : "ítems"} adentro. ${
            children.length === 1 ? "También se eliminará." : "También se eliminarán."
          }`
        : "¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: hasChildren ? "Eliminar todo" : "Eliminar",
          style: "destructive",
          onPress: () => {
            if (hasChildren) {
              deleteItem.mutate([...children.map((c) => c.id), id]);
            } else {
              deleteItem.mutate(id);
            }
          },
        },
      ]
    );
  };

  const cycleMetricUnit = (metricId: string) => {
    const metric = editingMetrics.find((m) => m.id === metricId);
    if (!metric) return;
    const compatible = getUnitsForMetric(metric);
    const current = ifMetricUnits[metricId] ?? metric.unitId;
    const idx = compatible.findIndex((u) => u.id === current);
    const next = compatible[(idx + 1) % compatible.length];
    if (next) setIfMetricUnits((p) => ({ ...p, [metricId]: next.id }));
  };

  // ─── Build catalog tree from flat list ───
  const rootItems = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter((i) => !i.parentId);
  }, [allItems]);

  const childrenOf = useCallback((parentId: string) => {
    if (!allItems) return [];
    return allItems.filter((i) => i.parentId === parentId);
  }, [allItems]);

  const hasChildren = useCallback((id: string) => {
    if (!allItems) return false;
    return allItems.some((i) => i.parentId === id);
  }, [allItems]);

  // ─── Pee config ───
  const [peeIntensity, setPeeIntensity] = useState<ConfigRange & { zones: Zone[] }>({
    min: 1, max: 8,
    zones: [
      { min: 1, max: 3, color: "#4CAF50", label: "Saludable" },
      { min: 4, max: 6, color: "#FFC107", label: "Precaución" },
      { min: 7, max: 8, color: "#F44336", label: "Alerta" },
    ],
  });
  const [peeHealth, setPeeHealth] = useState<HealthConfig>({
    enabled: false,
    min: 1, max: 8,
    zones: [
      { min: 1, max: 2, color: "#4CAF50", label: "Transparente", emoji: "💧" },
      { min: 3, max: 4, color: "#8BC34A", label: "Claro",       emoji: "💦" },
      { min: 5, max: 6, color: "#FFC107", label: "Amarillo",    emoji: "🟡" },
      { min: 7, max: 8, color: "#F44336", label: "Oscuro",      emoji: "🟠", isAlert: true },
    ],
  });

  // ─── Poop config ───
  const [poopIntensity, setPoopIntensity] = useState<ConfigRange & { zones: Zone[] }>({
    min: 1, max: 4,
    zones: [
      { min: 1, max: 1, color: "#D2B48C", label: "Poquitita", emoji: "💩" },
      { min: 2, max: 2, color: "#A0785A", label: "Poquita",   emoji: "💩" },
      { min: 3, max: 3, color: "#8B6914", label: "Normal",    emoji: "💩" },
      { min: 4, max: 4, color: "#5C4033", label: "Mucha",     emoji: "💩💩" },
    ],
  });
  const [poopConsistency, setPoopConsistency] = useState<ConfigRange & { zones: Zone[] }>({
    min: 1, max: 5,
    zones: [
      { min: 1, max: 1, color: "#6D4C41", label: "Dura",   emoji: "💎", isAlert: true },
      { min: 2, max: 2, color: "#8D6E63", label: "Sólida", emoji: "🍫" },
      { min: 3, max: 3, color: "#A1887F", label: "Pastosa",  emoji: "🥜" },
      { min: 4, max: 4, color: "#BCAAA4", label: "Líquida",  emoji: "💧" },
      { min: 5, max: 5, color: "#EF5350", label: "Acuosa",   emoji: "🌊", isAlert: true },
    ],
  });
  const [poopHealth, setPoopHealth] = useState<HealthConfig>({
    enabled: false,
    min: 1, max: 8,
    zones: [
      { min: 1, max: 1, color: "#8BC34A", label: "Verde",   emoji: "🟢" },
      { min: 2, max: 2, color: "#FFC107", label: "Amarillo", emoji: "🟡" },
      { min: 3, max: 3, color: "#8B4513", label: "Marrón",  emoji: "🟤" },
      { min: 4, max: 4, color: "#E65100", label: "Naranja", emoji: "🟠" },
      { min: 5, max: 5, color: "#9E9E9E", label: "Arcilla", emoji: "🩻",  isAlert: true },
      { min: 6, max: 6, color: "#B71C1C", label: "Rojo",    emoji: "💉",  isAlert: true },
      { min: 7, max: 7, color: "#212121", label: "Negro",   emoji: "⚫",  isAlert: true },
      { min: 8, max: 8, color: "#EEEEEE", label: "Blanco",  emoji: "⚪",  isAlert: true },
    ],
  });

  // Load configs from AsyncStorage
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.PEE_INTENSITY_CONFIG),
      AsyncStorage.getItem(KEYS.PEE_HEALTH_CONFIG),
      AsyncStorage.getItem(KEYS.POOP_INTENSITY_CONFIG),
      AsyncStorage.getItem(KEYS.POOP_HEALTH_CONFIG),
      AsyncStorage.getItem(KEYS.POOP_CONSISTENCY_CONFIG),
    ]).then(([pi, ph, poi, poh, pc]) => {
      if (pi) try { setPeeIntensity(JSON.parse(pi)); } catch {}
      if (ph) try { setPeeHealth(JSON.parse(ph)); } catch {}
      if (poi) try { setPoopIntensity(JSON.parse(poi)); } catch {}
      if (poh) try { setPoopHealth(JSON.parse(poh)); } catch {}
      if (pc) try { setPoopConsistency(JSON.parse(pc)); } catch {}
    });
  }, []);

  const saveAllConfigs = () => {
    AsyncStorage.multiSet([
      [KEYS.PEE_INTENSITY_CONFIG, JSON.stringify(peeIntensity)],
      [KEYS.PEE_HEALTH_CONFIG, JSON.stringify(peeHealth)],
      [KEYS.POOP_INTENSITY_CONFIG, JSON.stringify(poopIntensity)],
      [KEYS.POOP_HEALTH_CONFIG, JSON.stringify(poopHealth)],
      [KEYS.POOP_CONSISTENCY_CONFIG, JSON.stringify(poopConsistency)],
    ]);
    Alert.alert("✅ Listo", "Configuración guardada");
  };

  const { mutate: deleteDiaperObs } = useDeleteDiaperObservation();

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
        onPress: () => deleteDiaperObs(id),
      },
    ]);
  };

  const handleObservationSave = (data: {
    emoji: string;
    label: string;
    isAlert: boolean;
    metrics: string;
  }) => {
    if (editingObs) {
      updateDiaper.mutate(
        { id: editingObs.id, ...data },
        { onSuccess: () => setEditingObs(null) }
      );
    } else {
      createDiaper.mutate(data, { onSuccess: () => setShowNewObsForm(false) });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />
      <View
        className="flex-row items-center px-4"
        style={{ padding: 16 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 16, minWidth: 44, minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: c.headerText, fontSize: 26, lineHeight: 28 }}>
            ←
          </Text>
        </TouchableOpacity>
        <Text style={{ color: c.headerText, fontWeight: "900", fontSize: 18 }}>
          🛠️ Personalizar
        </Text>
      </View>

      {/* Theme toggle */}
      <ThemeToggle />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ─── Tabs ─── */}
        <View
          className="flex-row px-4" style={{ backgroundColor: c.headerBg }}
        >
          {[
            { key: "catalog" as const, label: "📋 Catálogo" },
            { key: "pee" as const, label: "💧 Pipí" },
            { key: "poop" as const, label: "💩 Popó" },
            { key: "obs" as const, label: "🧷 Obs. Pañal" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 3,
                borderBottomColor:
                  activeTab === t.key ? c.headerText : "transparent",
              }}
              onPress={() => setActiveTab(t.key)}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "800",
                  color:
                    activeTab === t.key
                      ? c.headerText
                      : "rgba(255,255,255,0.6)",
                  fontSize: 10,
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {editingObs || showNewObsForm ? (
          <View
            style={{
              flex: 1,
              backgroundColor: c.surface,
            }}
          >
            <ObservationForm
              initial={editingObs ?? undefined}
              onSave={handleObservationSave}
              onCancel={() => { setEditingObs(null); setShowNewObsForm(false); }}
            />
          </View>
          ) : (
          <ScrollView
            className="flex-1" style={{ backgroundColor: c.surface }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === "catalog" && !itemForm && (
              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12 }}>
                    {allItems?.length ?? 0} items
                  </Text>
                  <TouchableOpacity
                    onPress={() => { setEditingItem(null); setShowItemEditor(true); }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 }}
                  >
                    <Text style={{ color: c.accent, fontWeight: "700", fontSize: 13 }}>
                      + Nuevo Item Raíz
                    </Text>
                  </TouchableOpacity>
                </View>
                {USER_CATEGORIES.map((catDef) => {
                  const catRootItems = rootItems.filter((i) => i.category === catDef.id);
                  if (catRootItems.length === 0) return null;
                  return (
                    <View
                      key={catDef.id}
                      style={{
                        backgroundColor: c.card,
                        borderRadius: 20,
                        padding: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "800",
                          fontSize: 13,
                          color: c.textMuted,
                          marginBottom: 12,
                          textTransform: "uppercase",
                        }}
                      >
                        {getCategoryEmoji(catDef.id)} {getCategoryLabel(catDef.id)}
                      </Text>
                      <View style={{ gap: 4 }}>
                        {catRootItems.map((root) => {
                          const children = childrenOf(root.id);
                          const isOpen = expanded.has(root.id);
                          const rootMetrics: EventMetric[] = (() => {
                            try { return JSON.parse(root.metrics ?? "[]"); } catch { return []; }
                          })();
                          return (
                            <View key={root.id}>
                              {/* Root item row */}
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  paddingVertical: 10,
                                  borderBottomWidth: 1,
                                  borderBottomColor: c.surface,
                                }}
                              >
                                <TouchableOpacity
                                  onPress={() => toggleExpanded(root.id)}
                                  style={{ paddingRight: 8 }}
                                >
                                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                                    {isOpen ? "▼" : "▶"}
                                  </Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 22, marginRight: 8 }}>{root.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>
                                    {root.name}
                                  </Text>
                                  {rootMetrics.length > 0 && (
                                    <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "600" }}>
                                      ⚙️ {rootMetrics.length} métrica{rootMetrics.length > 1 ? "s" : ""}
                                    </Text>
                                  )}
                                </View>
                                {/* Quick action toggle */}
                                <TouchableOpacity
                                  onPress={() => updateItem.mutate({ id: root.id, isQuickAction: !root.isQuickAction })}
                                  style={{
                                    paddingHorizontal: 8, paddingVertical: 4,
                                    borderRadius: 8,
                                    backgroundColor: root.isQuickAction ? c.accent : c.surface,
                                    marginRight: 6,
                                  }}
                                >
                                  <Text style={{ fontSize: 12, color: root.isQuickAction ? "#FFF" : c.textMuted }}>
                                    ⚡
                                  </Text>
                                </TouchableOpacity>
                                {/* Edit */}
                                <TouchableOpacity onPress={() => { setEditingItem(root); setShowItemEditor(true); }}>
                                  <Text style={{ color: c.accent, fontSize: 16, paddingHorizontal: 6 }}>✏️</Text>
                                </TouchableOpacity>
                                {!root.isSystem && (
                                  <TouchableOpacity onPress={() => handleDeleteItem(root.id)}>
                                    <Text style={{ color: c.danger, fontSize: 16, paddingHorizontal: 6 }}>🗑️</Text>
                                  </TouchableOpacity>
                                )}
                              </View>

                              {/* Children (expanded section) */}
                              {isOpen && (
                                <View style={{ paddingLeft: 28, paddingTop: 4, gap: 4 }}>
                                  {children.length === 0 && (
                                    <Text style={{ color: c.textDim, fontSize: 12, fontStyle: "italic", paddingVertical: 8 }}>
                                      Sin plantillas aún
                                    </Text>
                                  )}
                                  {children.map((child) => {
                                    const childMetrics: EventMetric[] = (() => {
                                      try { return JSON.parse(child.metrics ?? "[]"); } catch { return []; }
                                    })();
                                    return (
                                      <View
                                        key={child.id}
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          paddingVertical: 8,
                                          borderBottomWidth: 1,
                                          borderBottomColor: c.surface,
                                        }}
                                      >
                                        <Text style={{ fontSize: 18, marginRight: 8 }}>{child.emoji}</Text>
                                        <View style={{ flex: 1 }}>
                                          <Text style={{ fontSize: 14, fontWeight: "700", color: c.textBody }}>
                                            {child.name}
                                          </Text>
                                          {childMetrics.length > 0 && (
                                            <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "600" }}>
                                              ⚙️ {childMetrics.length} métrica{childMetrics.length > 1 ? "s" : ""}
                                            </Text>
                                          )}
                                        </View>
                                        <TouchableOpacity
                                          onPress={() => updateItem.mutate({ id: child.id, isQuickAction: !child.isQuickAction })}
                                          style={{
                                            paddingHorizontal: 8, paddingVertical: 4,
                                            borderRadius: 8,
                                            backgroundColor: child.isQuickAction ? c.accent : c.surface,
                                            marginRight: 6,
                                          }}
                                        >
                                          <Text style={{ fontSize: 12, color: child.isQuickAction ? "#FFF" : c.textMuted }}>
                                            ⚡
                                          </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => { setEditingItem(child); setShowItemEditor(true); }}>
                                          <Text style={{ color: c.accent, fontSize: 16, paddingHorizontal: 6 }}>✏️</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteItem(child.id)}>
                                          <Text style={{ color: c.danger, fontSize: 16, paddingHorizontal: 6 }}>🗑️</Text>
                                        </TouchableOpacity>
                                      </View>
                                    );
                                  })}
                                  {/* [+ New child] button */}
                                  <TouchableOpacity
                                    onPress={() => {
                                      setEditingItem(null);
                                      // Use the inline form with parentId set
                                      openItemForm(undefined, root.id, root.category);
                                    }}
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      paddingVertical: 8,
                                      gap: 6,
                                    }}
                                  >
                                    <Text style={{ color: c.accent, fontWeight: "700", fontSize: 13 }}>
                                      + Nuevo
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {activeTab === "catalog" && itemForm && (
              <View
                style={{
                  backgroundColor: c.card,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    fontSize: 13,
                    color: c.textMuted,
                    marginBottom: 16,
                    textTransform: "uppercase",
                  }}
                >
                  {itemEdit ? "Editar ítem" : ifParentId ? "Nuevo ítem en catálogo" : "Nuevo ítem raíz"}
                </Text>

                <View style={{ gap: 12 }}>
                  {!itemEdit && (
                    <View style={{ gap: 4 }}>
                      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Categoría</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {USER_CATEGORIES.map((catDef) => (
                          <TouchableOpacity
                            key={catDef.id}
                            onPress={() => setIfCategory(catDef.id)}
                            style={{
                              paddingVertical: 8, paddingHorizontal: 12,
                              borderRadius: 99,
                              backgroundColor: ifCategory === catDef.id ? c.accent : c.surface,
                              minHeight: 36,
                            }}
                          >
                            <Text style={{
                              color: ifCategory === catDef.id ? "#FFF" : c.textBody,
                              fontWeight: "700", fontSize: 13,
                            }}>
                              {getCategoryEmoji(catDef.id)} {getCategoryLabel(catDef.id)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Emoji</Text>
                    <TextInput
                      value={ifEmoji}
                      onChangeText={setIfEmoji}
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12, padding: 12,
                        color: c.textBody, fontSize: 20,
                        textAlign: "center",
                      }}
                    />
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Nombre</Text>
                    <TextInput
                      value={ifName}
                      onChangeText={setIfName}
                      placeholder="Ej: OneDrop, Paracetamol..."
                      placeholderTextColor={c.textDim}
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12, padding: 12,
                        color: c.textBody, fontSize: 15,
                      }}
                    />
                  </View>

                  {/* Interactive Metrics Editor */}
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                        Métricas
                      </Text>
                      <TouchableOpacity onPress={() => {
                        const newM = { id: "m_" + Math.random().toString(36).substring(2, 8), name: "", unitId: "count", scaleMin: 0, scaleMax: 100 };
                        setIfMetricsJson(JSON.stringify([...editingMetrics, newM]));
                      }} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ color: c.accent, fontWeight: "700", fontSize: 13 }}>
                          + Añadir
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {editingMetrics.length === 0 && (
                      <Text style={{ color: c.textDim, fontSize: 12, fontStyle: "italic" }}>
                        Sin métricas. Los eventos serán solo nota.
                      </Text>
                    )}

                    {editingMetrics.map((m, idx) => {
                      const u = getUnit(m.unitId);
                      const compatible = getUnitsForMetric(m);
                      return (
                        <View key={m.id} style={{
                          backgroundColor: c.surface, borderRadius: 12, padding: 12,
                          marginBottom: 8, gap: 8,
                        }}>
                          {/* Header: name + remove */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ color: c.textDim, fontSize: 11, fontWeight: "700" }}>#{idx + 1}</Text>
                            <TextInput
                              value={m.name}
                              onChangeText={(v) => {
                                const copy = [...editingMetrics];
                                copy[idx] = { ...copy[idx], name: v };
                                setIfMetricsJson(JSON.stringify(copy));
                              }}
                              placeholder="Nombre de la métrica"
                              placeholderTextColor={c.textDim}
                              style={{
                                flex: 1, backgroundColor: c.card, borderRadius: 8,
                                padding: 8, fontSize: 13, color: c.textBody, minHeight: 36,
                              }}
                            />
                            <TouchableOpacity onPress={() => {
                              setIfMetricsJson(JSON.stringify(editingMetrics.filter((_, i) => i !== idx)));
                            }} style={{ minHeight: 36, justifyContent: "center" }}>
                              <Text style={{ color: c.textDim, fontSize: 16 }}>✕</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Unit selector: show compatible units */}
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "600" }}>Unidad:</Text>
                            {compatible.map((unit) => (
                              <TouchableOpacity
                                key={unit.id}
                                onPress={() => {
                                  const copy = [...editingMetrics];
                                  copy[idx] = { ...copy[idx], unitId: unit.id };
                                  setIfMetricsJson(JSON.stringify(copy));
                                }}
                                style={{
                                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99,
                                  backgroundColor: m.unitId === unit.id ? c.accent : c.card,
                                }}
                              >
                                <Text style={{
                                  fontSize: 11, fontWeight: "700",
                                  color: m.unitId === unit.id ? "#FFF" : c.textMuted,
                                }}>
                                  {unit.symbol || unit.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Scale min/max */}
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: "600", marginBottom: 2 }}>Mín</Text>
                              <TextInput
                                value={m.scaleMin?.toString() ?? "0"}
                                onChangeText={(v) => {
                                  const copy = [...editingMetrics];
                                  copy[idx] = { ...copy[idx], scaleMin: parseFloat(v) || 0 };
                                  setIfMetricsJson(JSON.stringify(copy));
                                }}
                                keyboardType="decimal-pad"
                                style={{
                                  backgroundColor: c.card, borderRadius: 8, padding: 8,
                                  fontSize: 13, color: c.textBody, minHeight: 36,
                                }}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: "600", marginBottom: 2 }}>Máx</Text>
                              <TextInput
                                value={m.scaleMax?.toString() ?? "100"}
                                onChangeText={(v) => {
                                  const copy = [...editingMetrics];
                                  copy[idx] = { ...copy[idx], scaleMax: parseFloat(v) || 0 };
                                  setIfMetricsJson(JSON.stringify(copy));
                                }}
                                keyboardType="decimal-pad"
                                style={{
                                  backgroundColor: c.card, borderRadius: 8, padding: 8,
                                  fontSize: 13, color: c.textBody, minHeight: 36,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {editingMetrics.length > 0 && (
                    <View style={{ gap: 12 }}>
                      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                        Valores por defecto
                      </Text>
                      {editingMetrics.map((m) => {
                        const u = getUnit(ifMetricUnits[m.id] ?? m.unitId);
                        const compatible = getUnitsForMetric(m);
                        return (
                          <View key={m.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                            <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13, minWidth: 80 }}>
                              {m.name}
                            </Text>
                            <TextInput
                              value={ifMetricValues[m.id] ?? ""}
                              onChangeText={(t) => setIfMetricValues((p) => ({ ...p, [m.id]: t.replace(/[^0-9.]/g, "") }))}
                              placeholder={String(m.scaleMin ?? 0)}
                              placeholderTextColor={c.textDim}
                              keyboardType="decimal-pad"
                              style={{
                                flex: 1,
                                backgroundColor: c.surface,
                                borderRadius: 12, padding: 10,
                                color: c.textBody, fontSize: 15,
                                textAlign: "center",
                              }}
                            />
                            {u && (
                              <TouchableOpacity
                                onPress={() => cycleMetricUnit(m.id)}
                                style={{
                                  paddingVertical: 8, paddingHorizontal: 12,
                                  borderRadius: 10,
                                  backgroundColor: c.surface,
                                  minHeight: 36,
                                }}
                              >
                                <Text style={{ color: c.accent, fontWeight: "700", fontSize: 13 }}>
                                  {u.symbol || u.name}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                      <Text style={{ color: c.textDim, fontSize: 11 }}>
                        Toca la unidad para cambiarla
                      </Text>
                    </View>
                  )}

                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Notas por defecto</Text>
                    <TextInput
                      value={ifNotes}
                      onChangeText={setIfNotes}
                      placeholder="Notas que se pre-cargarán al usar el ítem"
                      placeholderTextColor={c.textDim}
                      multiline
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12, padding: 12,
                        color: c.textBody, fontSize: 15,
                        minHeight: 60, textAlignVertical: "top",
                      }}
                    />
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Etiquetas</Text>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <TextInput
                        value={ifTagInput}
                        onChangeText={setIfTagInput}
                        placeholder="Ej: Vitamina"
                        placeholderTextColor={c.textDim}
                        onSubmitEditing={() => {
                          const t = ifTagInput.trim();
                          if (t && !ifTags.includes(t)) setIfTags([...ifTags, t]);
                          setIfTagInput("");
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: c.surface,
                          borderRadius: 10, padding: 10,
                          color: c.textBody, fontSize: 14,
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          const t = ifTagInput.trim();
                          if (t && !ifTags.includes(t)) setIfTags([...ifTags, t]);
                          setIfTagInput("");
                        }}
                        disabled={!ifTagInput.trim()}
                        style={{
                          paddingVertical: 10, paddingHorizontal: 16,
                          borderRadius: 10,
                          backgroundColor: ifTagInput.trim() ? c.accent : c.textDim,
                        }}
                      >
                        <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>Añadir</Text>
                      </TouchableOpacity>
                    </View>
                    {ifTags.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {ifTags.map((t, i) => (
                          <TouchableOpacity
                            key={i}
                            onPress={() => setIfTags(ifTags.filter((_, j) => j !== i))}
                            style={{
                              flexDirection: "row", alignItems: "center", gap: 4,
                              backgroundColor: c.surface, borderRadius: 99,
                              paddingVertical: 4, paddingHorizontal: 10,
                            }}
                          >
                            <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13 }}>{t}</Text>
                            <Text style={{ color: c.textDim, fontSize: 12 }}>✕</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <Text style={{ color: c.textDim, fontSize: 11 }}>
                      Toca una etiqueta para eliminarla.
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setIfQuick(!ifQuick)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <View style={{
                      width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                      borderColor: ifQuick ? c.accent : c.textDim,
                      backgroundColor: ifQuick ? c.accent : "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {ifQuick && <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>✓</Text>}
                    </View>
                    <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 14 }}>
                      ⚡ Mostrar en inicio como acceso directo
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <BigButton
                        label="Cancelar"
                        variant="secondary"
                        onPress={() => { setItemForm(false); setItemEdit(null); }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <BigButton
                        label="Guardar"
                        onPress={handleSaveItem}
                        loading={createItem.isPending || updateItem.isPending}
                        disabled={!ifName.trim() || !ifCategory}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {activeTab === "pee" && (
              <PeeConfigSection
                intensity={peeIntensity}
                setIntensity={setPeeIntensity}
                health={peeHealth}
                setHealth={setPeeHealth}
              />
            )}

            {activeTab === "poop" && (
              <PoopConfigSection
                intensity={poopIntensity}
                setIntensity={setPoopIntensity}
                health={poopHealth}
                setHealth={setPoopHealth}
                consistency={poopConsistency}
                setConsistency={setPoopConsistency}
              />
            )}

            {activeTab === "obs" && (
              <>
                <View
                  style={{
                    backgroundColor: c.card,
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
                        color: c.textMuted,
                        textTransform: "uppercase",
                      }}
                    >
                      Observaciones ({diaperObs?.length || 0})
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowNewObsForm(true)}
                      style={{
                        backgroundColor: c.accent,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 99,
                      }}
                    >
                      <Text
                        style={{
                          color: c.textBody,
                          fontWeight: "800",
                          fontSize: 12,
                        }}
                      >
                        + Nueva
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ gap: 8 }}>
                    {diaperObs?.map((item) => {
                      const parsedMetrics: ObservationMetric[] = item.metrics
                        ? safeJsonParse(item.metrics, [] as ObservationMetric[])
                        : [];
                      const hasMetrics = parsedMetrics.length > 0;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setEditingObs(item)}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: c.surface,
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
                                  color: c.textBody,
                                }}
                              >
                                {item.label}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: c.textMuted,
                                  fontWeight: "600",
                                }}
                              >
                                {hasMetrics
                                  ? `${parsedMetrics.length} métrica(s)`
                                  : "Tag simple"}
                              </Text>
                            </View>
                            <Text style={{ color: c.textMuted, fontSize: 14 }}>
                              ✏️
                            </Text>
                          </View>
                          {!item.isSystem && (
                            <TouchableOpacity
                              onPress={() =>
                                handleDeleteDiaper(item.id, item.isSystem)
                              }
                            >
                              <Text style={{ color: c.danger, fontSize: 18 }}>
                                🗑️
                              </Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <BigButton label="💾 Guardar todo" onPress={saveAllConfigs} />
              </>
            )}

            {activeTab !== "obs" && (
              <View style={{ marginTop: 12 }}>
                <BigButton label="💾 Guardar configuración" onPress={saveAllConfigs} />
              </View>
            )} 

          </ScrollView>
        )}

        <ItemEditorModal
          visible={showItemEditor}
          onClose={() => { setShowItemEditor(false); setEditingItem(null); }}
          onSelect={() => { setShowItemEditor(false); setEditingItem(null); }}
          item={editingItem}
        />

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
