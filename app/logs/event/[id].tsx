import { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTimelineEvent,
  useEventTypes,
  useUpdateTimelineEvent,
  useDeleteTimelineEvent,
  useDiaperObservations,
} from "@/src/hooks/useTimeline";
import { useActiveProfile } from "@/src/hooks/useProfile";
import { useActiveBaby } from "@/src/hooks/useBaby";
import {
  useActiveFeedingSession,
  usePauseFeeding,
} from "@/src/hooks/useFeedingSessions";
import { useCatalogItem, useCatalogItems } from "@/src/hooks/useCatalogItems";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { FoodDetailModal } from "@/src/components/food/FoodDetailModal";
import { getZoneColor, getZoneLabel, parseMetrics, getMetricZoneColor, getMetricZoneLabel } from "@/src/db/schema";
import { useTheme } from "@/src/theme/useTheme";
import { getUnit, getUnitsByDimension, getUnitsForMetric } from "@/src/units/registry";
import { findBestUnit } from "@/src/units/helpers";
import type { EventMetric } from "@/src/units/types";
import { getCategory, getCategoryLabel, getCategoryEmoji, USER_CATEGORIES } from "@/src/utils/categories";
import { getCachedDeviceId } from "@/src/sync/device";
import { useFoodCatalog, FOOD_GROUPS, SUBGROUPS, BADGE_FILTERS } from "@/src/hooks/useFoodLogs";
import { useCamera } from "@/src/hooks/useCamera";
import { useDebounce } from "@/src/hooks/useDebounce";
import { FoodItemChip } from "@/src/components/food/FoodItemChip";

const GROUP_KEYS = Object.keys(FOOD_GROUPS).sort();

function formatDateTime(ts: Date | string | number | undefined | null): string {
  if (!ts) return "--";
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hour}:${min}`;
}

export default function EventDetailScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event } = useTimelineEvent(id);
  const { data: eventTypes } = useEventTypes();
  const { data: profile } = useActiveProfile();
  const { data: baby } = useActiveBaby();
  const updateEvent = useUpdateTimelineEvent();
  const deleteEvent = useDeleteTimelineEvent();
  const { data: diaperObs } = useDiaperObservations();
  const { data: catalogItem } = useCatalogItem(event?.eventItemId ?? undefined);
  const { data: rootCatalogItem } = useCatalogItem(
    catalogItem?.parentId ?? undefined
  );

  const [editing, setEditing] = useState(false);
  const [editTimestamp, setEditTimestamp] = useState<Date>(new Date());
  const [editNotes, setEditNotes] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editDisplayUnits, setEditDisplayUnits] = useState<Record<string, string>>({});
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [editFoods, setEditFoods] = useState<{ id: string; emoji: string | null; name: string }[]>([]);
  const [editIsFirst, setEditIsFirst] = useState(false);
  const [editReaction, setEditReaction] = useState("");
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [selectedFoodGroup, setSelectedFoodGroup] = useState<string | null>(null);
  const [selectedFoodSubgroups, setSelectedFoodSubgroups] = useState<string[]>([]);
  const [selectedFoodBadges, setSelectedFoodBadges] = useState<string[]>([]);
  const [collapsedFoodGroups, setCollapsedFoodGroups] = useState<Record<string, boolean>>({});
  const [foodSearch, setFoodSearch] = useState("");
  const debouncedSearch = useDebounce(foodSearch, 250);
  const [detailFood, setDetailFood] = useState<any>(null);
  const { data: foodCatalog } = useFoodCatalog();
  const { takePhoto, pickImage } = useCamera();
  const { data: allItems } = useCatalogItems();
  const { data: activeFeeding } = useActiveFeedingSession(baby?.id);
  const pauseFeeding = usePauseFeeding();
  const [editStep, setEditStep] = useState<"category" | "root" | "child" | "form" | null>(null);
  const [editSelCategory, setEditSelCategory] = useState<string | null>(null);
  const [editSelRootId, setEditSelRootId] = useState<string | null>(null);
  const [editSelItemId, setEditSelItemId] = useState<string | null>(null);

  const evType = eventTypes?.find((t) => t.id === event?.eventTypeId);
  const isOwn = event?.profileId === profile?.id;

  const MEDICAL_KEYS = new Set(["medication", "temperature", "vomit"]);

  const editSelItem = useMemo(() => {
    if (!allItems || !editSelItemId) return null;
    return allItems.find((i) => i.id === editSelItemId) ?? null;
  }, [allItems, editSelItemId]);

  const editSelRootItem = useMemo(() => {
    if (!allItems || !editSelRootId) return null;
    return allItems.find((i) => i.id === editSelRootId) ?? null;
  }, [allItems, editSelRootId]);

  const parseMetricsJson = (raw: string | null | undefined): EventMetric[] => {
    if (!raw) return [];
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  };

  const editEvMetrics: EventMetric[] = editSelItem
    ? parseMetricsJson(editSelItem.metrics)
    : [];

  const evMetrics: EventMetric[] = editing
    ? editEvMetrics
    : catalogItem
      ? parseMetricsJson(catalogItem.metrics)
      : evType
        ? parseMetricsJson(evType.metrics)
        : [];

  const meta = event?.metadata
    ? (() => { try { return JSON.parse(event.metadata); } catch { return null; } })()
    : null;

  const resolvedEmoji = catalogItem?.emoji ?? evType?.emoji ?? meta?.presetEmoji ?? "📝";
  const resolvedLabel = catalogItem?.name ?? evType?.label ?? meta?.presetName ?? event?.eventTypeId ?? "Evento";
  const categoryKey = catalogItem?.category ?? evType?.category;
  const hierarchyLabel = rootCatalogItem
    ? `${rootCatalogItem.emoji} ${rootCatalogItem.name}  ›  ${resolvedEmoji} ${resolvedLabel}`
    : null;

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

  const itemLabel = (id: string) => {
    const item = allItems?.find((i) => i.id === id);
    return item ? `${item.emoji ?? ""} ${item.name}` : id;
  };

  const itemHasChildren = (id: string) => allItems?.some((i) => i.parentId === id) ?? false;

  const toggleFoodSubgroup = useCallback((sg: string) => {
    setSelectedFoodSubgroups((prev) =>
      prev.includes(sg) ? prev.filter((x) => x !== sg) : [...prev, sg]
    );
  }, []);

  const toggleFoodBadge = useCallback((bf: string) => {
    setSelectedFoodBadges((prev) =>
      prev.includes(bf) ? prev.filter((x) => x !== bf) : [...prev, bf]
    );
  }, []);

  const groupedFoods = useMemo(() => {
    const all = foodCatalog ?? [];
    const q = debouncedSearch.toLowerCase().trim();
    const visible = all.filter((f: any) => !f.hidden);
    const groups: Record<string, any[]> = {};
    for (const f of visible) {
      if (q && !f.name.toLowerCase().includes(q) && !(f.emoji ?? "").includes(q)) continue;
      if (selectedFoodGroup && f.group !== selectedFoodGroup) continue;
      if (selectedFoodSubgroups.length > 0 && (!f.subgroup || !selectedFoodSubgroups.includes(f.subgroup))) continue;
      if (selectedFoodBadges.length > 0 && !selectedFoodBadges.some((bf) => BADGE_FILTERS.find((b) => b.key === bf)?.test(f))) continue;
      const g = f.group || "other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }
    return groups;
  }, [foodCatalog, debouncedSearch, selectedFoodGroup, selectedFoodSubgroups, selectedFoodBadges]);

  const availableSubgroups = useMemo(() => {
    const all = foodCatalog ?? [];
    const q = debouncedSearch.toLowerCase().trim();
    const visible = all.filter((f: any) => !f.hidden && (!selectedFoodGroup || f.group === selectedFoodGroup));
    const sgs = new Set<string>();
    for (const f of visible) {
      if (q && !f.name.toLowerCase().includes(q) && !(f.emoji ?? "").includes(q)) continue;
      if (f.subgroup) sgs.add(f.subgroup);
    }
    return [...sgs] as string[];
  }, [foodCatalog, debouncedSearch]);

  const toggleFoodGroup = useCallback((group: string) => {
    setCollapsedFoodGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  const toggleEditFood = useCallback((f: any) => {
    setEditFoods((prev) => {
      const exists = prev.some((ef) => ef.id === f.id);
      if (exists) return prev.filter((ef) => ef.id !== f.id);
      return [...prev, { id: f.id, emoji: f.emoji, name: f.name }];
    });
  }, []);

  const childrenOf = (parentId: string) =>
    allItems?.filter((i) => i.parentId === parentId) ?? [];

  const isMedical = editSelRootId ? MEDICAL_KEYS.has(editSelRootId) : false;

  const handleStartEditing = () => {
    if (!event) return;
    setEditTimestamp(new Date(event.timestamp));
    setEditNotes(event.notes ?? "");

    const vals: Record<string, string> = {};
    try {
      const ev = JSON.parse(event.values ?? "{}");
      for (const [k, v] of Object.entries(ev)) vals[k] = String(v);
    } catch {}
    setEditValues(vals);
    setEditDisplayUnits({});

    const tags: string[] = meta?.tags && Array.isArray(meta.tags) ? meta.tags : [];
    setEditTags(tags);
    setEditTagInput("");

    const foodsFromMeta = meta?.foods && Array.isArray(meta.foods) ? meta.foods : [];
    setEditFoods(foodsFromMeta);
    setEditIsFirst(!!meta?.isFirst);
    setEditReaction(meta?.reaction ?? "");
    setSelectedFoodGroup(null);
    setEditImageUri(meta?.imageUri ?? null);

    // Init selection from event
    const initCategory = catalogItem?.category ?? evType?.category ?? null;
    const initRootId = event.eventTypeId;
    const initItemId = event.eventItemId ?? event.eventTypeId;
    setEditSelCategory(initCategory);
    setEditSelRootId(initRootId);
    setEditSelItemId(initItemId);
    setEditStep(catalogItem?.parentId ? "form" : "form");

    setEditing(true);
  };

  // Reset values when item selection changes in edit mode (not on initial entry)
  const prevEditItemId = useRef<string | undefined>(undefined);
  if (editing && editSelItemId !== prevEditItemId.current && prevEditItemId.current !== undefined) {
    prevEditItemId.current = editSelItemId as string | undefined;
    const newItem = allItems?.find((i) => i.id === editSelItemId);
    if (newItem) {
      const defaults = (() => { try { return JSON.parse(newItem.defaultValues ?? "{}"); } catch { return {}; } })() as Record<string, number>;
      setEditValues(Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, String(v)])));
      setEditDisplayUnits({});
    }
  }
  if (editing && prevEditItemId.current === undefined) prevEditItemId.current = editSelItemId as string | undefined;
  if (!editing) prevEditItemId.current = undefined;

  const handleSaveEdit = async () => {
    if (!event || !baby || !editSelRootId || !editSelItemId) return;
    try {
      if (activeFeeding && activeFeeding.status === "active" && isMedical) {
        await pauseFeeding.mutateAsync(activeFeeding);
      }

      const numericValues: Record<string, number> = {};
      for (const [k, v] of Object.entries(editValues)) {
        if (v !== "") {
          const num = parseFloat(v);
          if (!isNaN(num)) {
            const mDef = evMetrics.find((m) => m.id === k);
            const displayUnitId = editDisplayUnits[k] ?? mDef?.unitId;
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

      const newMeta = { ...(meta ?? {}) };
      if (editTags.length > 0) {
        newMeta.tags = editTags;
      } else {
        delete newMeta.tags;
      }

      if (editFoods.length > 0) {
        newMeta.foods = editFoods;
      } else {
        delete newMeta.foods;
      }
      newMeta.isFirst = editIsFirst;
      if (editReaction.trim()) {
        newMeta.reaction = editReaction.trim();
      } else {
        delete newMeta.reaction;
      }
      if (editImageUri) {
        newMeta.imageUri = editImageUri;
      } else {
        delete newMeta.imageUri;
      }

      await updateEvent.mutateAsync({
        id: event.id,
        babyId: baby.id,
        eventTypeId: editSelRootId ?? undefined,
        eventItemId: editSelItemId ?? null,
        timestamp: editTimestamp,
        notes: editNotes || null,
        values: Object.keys(numericValues).length > 0 ? numericValues : undefined,
        metadata: Object.keys(newMeta).length > 0 ? newMeta : null,
      });
      setEditing(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar el evento");
    }
  };

  if (!event) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: c.surface }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text className="text-base" style={{ color: c.textDim }}>Cargando...</Text>
        </View>
      <FoodDetailModal food={detailFood} visible={!!detailFood} onClose={() => setDetailFood(null)} />
    </SafeAreaView>
    );
  }

  let metadataDisplay: { label: string; value: string; color?: string }[] = [];
  if (event.metadata) {
    try {
      const m = JSON.parse(event.metadata);
      if (m.weightGrams != null)
        metadataDisplay.push({ label: "Peso pañal", value: `${m.weightGrams}g` });
      if (m.heightMm != null)
        metadataDisplay.push({ label: "Estatura", value: `${(m.heightMm / 10).toFixed(1)} cm` });
      if (m.headCircMm != null)
        metadataDisplay.push({ label: "C. Cefálica", value: `${(m.headCircMm / 10).toFixed(1)} cm` });
      if (m.celsius != null)
        metadataDisplay.push({ label: "Temperatura", value: `${m.celsius}°C` });
      if (m.medicineName)
        metadataDisplay.push({
          label: "Medicamento",
          value: m.dose ? `${m.medicineName} (${m.dose})` : m.medicineName,
        });
      if (m.peeIntensity > 0 || m.poopIntensity > 0) {
        const parts: string[] = [];
        if (m.peeIntensity > 0) parts.push(`💦 ${m.peeIntensity}`);
        if (m.poopIntensity > 0) parts.push(`💩 ${m.poopIntensity}`);
        metadataDisplay.push({ label: "Pañal", value: parts.join(" · ") });
      }
      if (m.peeHealth != null && m.peeHealth > 0) {
        metadataDisplay.push({ label: "💧 Pipí (color)", value: `🧪 ${m.peeHealth}`, color: c.growth });
      }
      if (m.poopHealth != null && m.poopHealth > 0) {
        metadataDisplay.push({ label: "💩 Popó (color)", value: `🧪 ${m.poopHealth}`, color: c.biological.poop });
      }
      if (m.observationValues && typeof m.observationValues === "object") {
        for (const [obsId, valOrMetrics] of Object.entries(m.observationValues)) {
          const obs = diaperObs?.find((o) => o.id === obsId);
          if (typeof valOrMetrics === "object" && valOrMetrics !== null) {
            const metrics = obs ? parseMetrics(obs.metrics) : [];
            for (const [metricId, mVal] of Object.entries(valOrMetrics as Record<string, number>)) {
              const metric = metrics.find((mm) => mm.id === metricId);
              if (metric) {
                metadataDisplay.push({
                  label: obs ? `${obs.emoji} ${obs.label} · ${metric.name}` : `${obsId}:${metricId}`,
                  value: `${mVal} · ${getMetricZoneLabel(metric, mVal) ?? ""}`,
                  color: getMetricZoneColor(metric, mVal),
                });
              } else {
                metadataDisplay.push({ label: obs ? `${obs.emoji} ${obs.label}` : obsId, value: `${mVal}` });
              }
            }
          } else {
            const color = getZoneColor(obs?.zones ?? null, valOrMetrics as number);
            const label = getZoneLabel(obs?.zones ?? null, valOrMetrics as number);
            metadataDisplay.push({
              label: obs ? `${obs.emoji} ${obs.label}` : obsId,
              value: `${valOrMetrics}${label ? ` · ${label}` : ""}`,
              color,
            });
          }
        }
      }
      if (m.observationIds?.length > 0) {
        const names = m.observationIds
          .map((oid: string) => {
            const o = diaperObs?.find((x) => x.id === oid);
            return o ? `${o.emoji} ${o.label}` : oid;
          })
          .join(", ");
        if (names) metadataDisplay.push({ label: "Tags", value: names });
      }
    } catch {}
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: c.surface, borderBottomColor: c.elevated }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-black" style={{ color: c.textBody }}>
          {resolvedEmoji} {resolvedLabel}
        </Text>
        <TouchableOpacity onPress={editing ? () => setEditing(false) : handleStartEditing}>
          <Text className="font-bold text-sm" style={{ color: c.accent }}>
            {editing ? "Cancelar" : "✏️"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Event info card */}
        <View className="rounded-2xl p-5 gap-3" style={{ backgroundColor: c.card }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text className="font-black text-[22px]" style={{ color: c.textBody }}>
              {resolvedEmoji}
            </Text>
            <Text
              className="font-bold text-xs px-2.5 py-1 rounded-full"
              style={{
                color: isOwn ? c.success : c.accent,
                backgroundColor: isOwn ? `${c.success}20` : c.accentLight,
              }}
            >
              {isOwn ? "Tú" : (profile?.name ?? "Otro cuidador")}
            </Text>
          </View>

          {/* Category badge */}
          {categoryKey && (
            <View style={{ flexDirection: "row" }}>
              <View style={{
                backgroundColor: getCategory(categoryKey).color + "20",
                borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3,
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: "800",
                  color: getCategory(categoryKey).color,
                }}>
                  {getCategory(categoryKey).emoji} {getCategory(categoryKey).label}
                </Text>
              </View>
            </View>
          )}

          {/* Hierarchy breadcrumb */}
          {hierarchyLabel && (
            <View className="rounded-lg p-3" style={{ backgroundColor: c.surface }}>
              <Text style={{ fontSize: 13, color: c.textBody, fontWeight: "600" }}>
                {hierarchyLabel}
              </Text>
            </View>
          )}

          <View className="rounded-xl p-3.5 gap-2" style={{ backgroundColor: c.surface }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text className="font-semibold text-[13px]" style={{ color: c.textDim }}>Fecha y hora</Text>
              <Text className="font-bold text-sm" style={{ color: c.textBody }}>
                {editing ? formatDateTime(editTimestamp) : formatDateTime(event.timestamp)}
              </Text>
            </View>
            {event.eventTypeId && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text className="font-semibold text-[13px]" style={{ color: c.textDim }}>Tipo</Text>
                <Text className="font-bold text-sm" style={{ color: c.textBody }}>
                  {resolvedEmoji} {resolvedLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Legacy metadata display (view mode only) */}
        {metadataDisplay.length > 0 && !editing && (
          <View className="rounded-2xl p-5 gap-2" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px]" style={{ color: c.textBody }}>📊 Detalles</Text>
            {metadataDisplay.map((m, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                  borderBottomWidth: i < metadataDisplay.length - 1 ? 1 : 0,
                  borderBottomColor: c.card,
                }}
              >
                <Text className="font-semibold text-sm" style={{ color: c.textMuted }}>{m.label}</Text>
                <Text style={{ color: m.color ?? c.textBody, fontWeight: "700", fontSize: 14 }}>
                  {m.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Preset metadata fallback (view mode) */}
        {!editing && meta?.presetName && !catalogItem && (
          <View className="rounded-2xl p-5 gap-1.5" style={{ backgroundColor: c.card }}>
            <Text className="font-bold text-xs" style={{ color: c.textDim }}>📋 De plantilla</Text>
            <Text className="font-medium text-sm" style={{ color: c.textBody }}>
              {meta.presetEmoji ?? ""} {meta.presetName}
            </Text>
          </View>
        )}

        {/* Food display (view mode) */}
        {!editing && meta?.foods && Array.isArray(meta.foods) && meta.foods.length > 0 && (
          <View className="rounded-2xl p-5 gap-2" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px]" style={{ color: c.textBody }}>🍽️ Alimentos</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(meta.foods as { id: string; emoji: string | null; name: string }[]).map((f) => {
                const fullFood = foodCatalog?.find((item: any) => item.id === f.id);
                return (
                <TouchableOpacity key={f.id} onLongPress={() => fullFood && setDetailFood(fullFood)} style={{
                  backgroundColor: c.surface, borderRadius: 99,
                  paddingVertical: 4, paddingHorizontal: 10,
                }}>
                  <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13 }}>
                    {f.emoji ?? ""} {f.name}
                  </Text>
                </TouchableOpacity>
              )})}
              {meta.isFirst && (
                <View style={{
                  backgroundColor: "#FFF3E0", borderRadius: 99,
                  paddingVertical: 4, paddingHorizontal: 10,
                }}>
                  <Text style={{ color: "#F57C00", fontWeight: "600", fontSize: 13 }}>🥇 Primera vez</Text>
                </View>
              )}
              {meta.reaction && (
                <View style={{
                  backgroundColor: c.surface, borderRadius: 99,
                  paddingVertical: 4, paddingHorizontal: 10,
                }}>
                  <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13 }}>😋 {meta.reaction}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Photo display (view mode) */}
        {!editing && meta?.imageUri && (
          <View className="rounded-2xl p-5 gap-2" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px]" style={{ color: c.textBody }}>📷 Foto</Text>
            <Image source={{ uri: meta.imageUri }} style={{ width: "100%", height: 250, borderRadius: 12 }} resizeMode="cover" />
          </View>
        )}

        {/* Tags display (view mode) */}
        {!editing && meta?.tags && Array.isArray(meta.tags) && meta.tags.length > 0 && (
          <View className="rounded-2xl p-5 gap-2" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px]" style={{ color: c.textBody }}>🏷️ Etiquetas</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(meta.tags as string[]).map((t, i) => (
                <View key={i} style={{
                  backgroundColor: c.surface, borderRadius: 99,
                  paddingVertical: 4, paddingHorizontal: 10,
                }}>
                  <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13 }}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Values display (view mode) */}
        {event.values && !editing && evMetrics.length > 0 && (() => {
          let eventValues: Record<string, number> = {};
          try { eventValues = JSON.parse(event.values); } catch {}
          const entries = evMetrics
            .map((m) => ({ m, v: eventValues[m.id] }))
            .filter((e) => e.v != null && !isNaN(e.v));
          if (entries.length === 0) return null;

          return (
            <View className="rounded-2xl p-5 gap-2" style={{ backgroundColor: c.card }}>
              <Text className="font-black text-[15px]" style={{ color: c.textBody }}>📐 Mediciones</Text>
              {entries.map(({ m, v }) => {
                const defaultUnit = getUnit(m.unitId);
                const dimension = defaultUnit?.dimension;
                let displayUnit = defaultUnit;
                let displayValue = v;
                if (defaultUnit && dimension && dimension !== 'dimensionless') {
                  const baseValue = defaultUnit.toBase(v);
                  const best = findBestUnit(baseValue, dimension);
                  displayUnit = best.unit;
                  displayValue = best.displayValue;
                }
                const matchedZone = m.zones?.find((z) => v >= z.min && v <= z.max);
                const zoneColor = matchedZone?.color;
                const zoneLabel = matchedZone?.label;
                return (
                  <View
                    key={m.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: c.card,
                    }}
                  >
                    <Text className="font-semibold text-sm" style={{ color: c.textMuted }}>
                      {m.name}
                    </Text>
                    <Text style={{ color: zoneColor ?? c.textBody, fontWeight: "700", fontSize: 14 }}>
                      {displayValue.toFixed(1)}{displayUnit?.symbol ? ` ${displayUnit.symbol}` : ""}
                      {zoneLabel ? ` · ${zoneLabel}` : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* Notes (view mode) */}
        {!editing && event.notes && (
          <View className="rounded-2xl p-5 gap-1.5" style={{ backgroundColor: c.card }}>
            <Text className="font-bold text-xs" style={{ color: c.textDim }}>📝 Notas</Text>
            <Text className="font-medium text-sm" style={{ color: c.textBody }}>{event.notes}</Text>
          </View>
        )}

        {/* Origen (trazabilidad) */}
        {!editing && (event.createdBy || event.updatedBy) && (
          <View className="rounded-2xl p-5 gap-1.5" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px]" style={{ color: c.textBody }}>📡 Origen</Text>
            {event.createdBy && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text className="font-semibold text-[13px]" style={{ color: c.textDim }}>Creado por</Text>
                <Text className="font-bold text-sm" style={{
                  color: event.createdBy === getCachedDeviceId() ? c.success : c.accent,
                }}>
                  {event.createdBy === getCachedDeviceId() ? "Este dispositivo" : event.createdBy.slice(0, 8) + "..."}
                </Text>
              </View>
            )}
            {event.updatedBy && event.updatedBy !== event.createdBy && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text className="font-semibold text-[13px]" style={{ color: c.textDim }}>Modificado por</Text>
                <Text className="font-bold text-sm" style={{
                  color: event.updatedBy === getCachedDeviceId() ? c.success : c.accent,
                }}>
                  {event.updatedBy === getCachedDeviceId() ? "Este dispositivo" : event.updatedBy.slice(0, 8) + "..."}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Edit mode — wizard */}
        {editing && (!editStep || editStep === "category") && (
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
                      setEditSelCategory(catDef.id);
                      setEditStep("root");
                    }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingHorizontal: 20, paddingVertical: 16,
                      borderRadius: 99,
                      backgroundColor: editSelCategory === catDef.id ? c.accent : c.elevated,
                      minHeight: 52,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{getCategoryEmoji(catDef.id)}</Text>
                    <Text style={{ color: editSelCategory === catDef.id ? c.textOnAccent : c.textBody, fontWeight: "700", fontSize: 15 }}>
                      {getCategoryLabel(catDef.id)}
                    </Text>
                    <Text style={{ color: c.textDim, fontSize: 13, marginLeft: 4 }}>({count})</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {editing && (editStep === "root" || editStep === "child") && editSelCategory && (
          <View style={{ gap: 16 }}>
            {editStep === "root" && (
              <TouchableOpacity onPress={() => { setEditStep("category"); setEditSelRootId(null); setEditSelItemId(null); }}>
                <Text style={{ color: c.accent, fontWeight: "600", fontSize: 14 }}>← Categorías</Text>
              </TouchableOpacity>
            )}
            {editStep === "child" && editSelRootItem && (
              <TouchableOpacity onPress={() => { setEditStep("root"); setEditSelRootId(null); setEditSelItemId(null); }}>
                <Text style={{ color: c.accent, fontWeight: "600", fontSize: 14 }}>← {itemLabel(editSelRootId!)}</Text>
              </TouchableOpacity>
            )}

            <Text style={{ color: c.accent, fontWeight: "800", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
              {editStep === "root"
                ? `${getCategoryEmoji(editSelCategory)} ${getCategoryLabel(editSelCategory)}`
                : `Ítems en ${itemLabel(editSelRootId!)}`}
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(editStep === "root"
                ? (catRoots[editSelCategory] ?? [])
                : childrenOf(editSelRootId!)
              ).map((item) => {
                const hasChildren = itemHasChildren(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (hasChildren) {
                        setEditSelRootId(item.id);
                        setEditStep("child");
                      } else {
                        setEditSelRootId(item.id);
                        setEditSelItemId(item.id);
                        setEditStep("form");
                      }
                    }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingHorizontal: 16, paddingVertical: 14,
                      borderRadius: 99,
                      backgroundColor: c.elevated,
                      minHeight: 48,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                    <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 14 }}>
                      {item.name}
                    </Text>
                    {hasChildren && <Text style={{ color: c.textDim, fontSize: 12, marginLeft: 4 }}>▶</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {editing && editStep === "form" && editSelItem && editSelRootItem && (
          <View className="rounded-2xl p-5 gap-4" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px] text-center" style={{ color: c.accent }}>✏️ Editar evento</Text>

            {/* Selected item indicator — tap to change back to wizard */}
            <TouchableOpacity onPress={() => setEditStep("category")}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: c.accent,
                paddingHorizontal: 16, paddingVertical: 10,
                borderRadius: 99, alignSelf: "flex-start",
              }}>
                <Text style={{ fontSize: 16 }}>{editSelItem.emoji}</Text>
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 14 }}>
                  {editSelItem.name}
                </Text>
                {editSelItem.id !== editSelRootId && (
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                    ({editSelRootItem.emoji} {editSelRootItem.name})
                  </Text>
                )}
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>✕</Text>
              </View>
            </TouchableOpacity>

            <View style={{ gap: 6 }}>
              <Text className="font-bold text-xs" style={{ color: c.textMuted }}>🕐 Fecha y hora</Text>
              <DateTimePicker value={editTimestamp} onChange={setEditTimestamp} />
            </View>

            {/* Edit metrics */}
            {evMetrics.length > 0 && (
              <View style={{ gap: 12 }}>
                <Text style={{ color: c.accent, fontWeight: "800", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
                  📐 Mediciones
                </Text>
                {evMetrics.map((m) => {
                  const u = getUnit(m.unitId);
                  const compatible = getUnitsForMetric(m);
                  const displayUnitId = editDisplayUnits[m.id] ?? m.unitId;
                  const displayUnit = getUnit(displayUnitId) ?? u;
                  const cycleUnit = () => {
                    const idx = compatible.findIndex((cu) => cu.id === displayUnitId);
                    const nextUnit = compatible[(idx + 1) % compatible.length];
                    if (!nextUnit) return;
                    const curUnit = getUnit(displayUnitId)!;
                    setEditDisplayUnits((prev) => ({ ...prev, [m.id]: nextUnit.id }));
                    setEditValues((prev) => {
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
                        {m.name}{" "}
                        {m.unitId ? <Text style={{ color: c.textDim }}>({m.unitId})</Text> : null}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <TextInput
                          value={editValues[m.id] ?? ""}
                          onChangeText={(v) => setEditValues((prev) => ({ ...prev, [m.id]: v }))}
                          placeholder="0"
                          placeholderTextColor={c.textDim}
                          keyboardType="numeric"
                          style={{
                            flex: 1,
                            backgroundColor: c.elevated,
                            borderRadius: 12,
                            padding: 14,
                            color: c.textBody,
                            fontSize: 15,
                            minHeight: 44,
                          }}
                        />
                        {compatible.length > 1 && (
                          <TouchableOpacity
                            onPress={cycleUnit}
                            style={{
                              backgroundColor: c.elevated,
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 14,
                              minHeight: 44,
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

            {/* Edit foods */}
            {editSelRootId === "food" && (
              <View style={{ gap: 10 }}>
                <Text style={{ color: c.accent, fontWeight: "800", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
                  🍽️ Alimentos
                </Text>
                {/* Search + filters */}
                <TextInput
                  value={foodSearch}
                  onChangeText={setFoodSearch}
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
                        onPress={() => setSelectedFoodGroup(selectedFoodGroup === k ? null : k)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                          backgroundColor: selectedFoodGroup === k ? c.accent : c.card,
                        }}
                      >
                        <Text style={{
                          fontSize: 12, fontWeight: "600",
                          color: selectedFoodGroup === k ? c.textOnAccent : c.textBody,
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
                          onPress={() => toggleFoodSubgroup(sg)}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                            backgroundColor: selectedFoodSubgroups.includes(sg) ? c.accent : c.card,
                          }}
                        >
                          <Text style={{
                            fontSize: 12, fontWeight: "600",
                            color: selectedFoodSubgroups.includes(sg) ? c.textOnAccent : c.textBody,
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
                        onPress={() => toggleFoodBadge(bf.key)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                          backgroundColor: selectedFoodBadges.includes(bf.key) ? c.accent : c.card,
                        }}
                      >
                        <Text style={{
                          fontSize: 12, fontWeight: "600",
                          color: selectedFoodBadges.includes(bf.key) ? c.textOnAccent : c.textBody,
                        }}>{bf.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {/* Accordion groups */}
                {Object.entries(groupedFoods).map(([group, foods]) => {
                  const isCollapsed = collapsedFoodGroups[group] ?? false;
                  const grpLabel = (FOOD_GROUPS as any)[group] ?? group;
                  return (
                  <View key={group}>
                    <TouchableOpacity
                      onPress={() => toggleFoodGroup(group)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 6,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: c.textMuted }}>
                        {isCollapsed ? "▶" : "▼"}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody }}>
                        {grpLabel}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.textMuted }}>
                        ({foods.length})
                      </Text>
                    </TouchableOpacity>
                    {!isCollapsed && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, paddingLeft: 14 }}>
                      {foods.map((f: any) => {
                        if (!f.id) return null;
                        return (
                        <FoodItemChip
                          key={f.id}
                          food={f}
                          selected={editFoods.some((ef: any) => ef.id === f.id)}
                          onPress={() => toggleEditFood(f)}
                          onLongPress={() => setDetailFood(f)}
                          colors={c}
                          subgroups={SUBGROUPS}
                        />
                      )})}
                    </View>
                    )}
                  </View>
                )})}
                {/* isFirst + Reaction */}
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => setEditIsFirst(!editIsFirst)}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingVertical: 8, paddingHorizontal: 12,
                      borderRadius: 99,
                      backgroundColor: editIsFirst ? "#FFF3E0" : c.elevated,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🥇</Text>
                    <Text style={{ color: editIsFirst ? "#F57C00" : c.textBody, fontWeight: "700", fontSize: 12 }}>
                      Primera vez
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    value={editReaction}
                    onChangeText={setEditReaction}
                    placeholder="Reacción (ej. le gustó)"
                    placeholderTextColor={c.textDim}
                    style={{
                      flex: 1, backgroundColor: c.elevated,
                      borderRadius: 10, padding: 10,
                      color: c.textBody, fontSize: 14,
                    }}
                  />
                </View>
              </View>
            )}

            {/* Edit photo */}
            <View style={{ gap: 6 }}>
              <Text className="font-bold text-xs" style={{ color: c.textMuted }}>📷 Foto</Text>
              {editImageUri ? (
                <View style={{ alignItems: "flex-start", gap: 8 }}>
                  <Image source={{ uri: editImageUri }} style={{ width: 120, height: 120, borderRadius: 12 }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setEditImageUri(null)}>
                    <Text style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}>Eliminar foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert("Foto", "¿Cómo quieres agregar una foto?", [
                      {
                        text: "📷 Cámara",
                        onPress: async () => { const uri = await takePhoto(); if (uri) setEditImageUri(uri); },
                      },
                      {
                        text: "🖼️ Galería",
                        onPress: async () => { const uri = await pickImage(); if (uri) setEditImageUri(uri); },
                      },
                      { text: "Cancelar", style: "cancel" },
                    ]);
                  }}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingVertical: 10, paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: c.elevated, alignSelf: "flex-start",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>📷</Text>
                  <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 13 }}>Agregar foto</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Edit tags */}
            <View style={{ gap: 6 }}>
              <Text className="font-bold text-xs" style={{ color: c.textMuted }}>🏷️ Etiquetas</Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                <TextInput
                  value={editTagInput}
                  onChangeText={setEditTagInput}
                  placeholder="Nueva etiqueta"
                  placeholderTextColor={c.textDim}
                  onSubmitEditing={() => {
                    const t = editTagInput.trim();
                    if (t && !editTags.includes(t)) setEditTags([...editTags, t]);
                    setEditTagInput("");
                  }}
                  style={{
                    flex: 1, backgroundColor: c.elevated,
                    borderRadius: 10, padding: 10,
                    color: c.textBody, fontSize: 14,
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    const t = editTagInput.trim();
                    if (t && !editTags.includes(t)) setEditTags([...editTags, t]);
                    setEditTagInput("");
                  }}
                  disabled={!editTagInput.trim()}
                  style={{
                    paddingVertical: 10, paddingHorizontal: 16,
                    borderRadius: 10,
                    backgroundColor: editTagInput.trim() ? c.accent : c.textDim,
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>Añadir</Text>
                </TouchableOpacity>
              </View>
              {editTags.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {editTags.map((t, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setEditTags(editTags.filter((_, j) => j !== i))}
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
              )}
            </View>

            {/* Edit notes */}
            <View style={{ gap: 6 }}>
              <Text className="font-bold text-xs" style={{ color: c.textMuted }}>📝 Notas</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Agregar nota..."
                placeholderTextColor={c.textMuted}
                multiline
                className="rounded-xl p-3.5 text-[15px]"
                style={{ backgroundColor: c.elevated, color: c.textBody, minHeight: 60, textAlignVertical: "top" }}
              />
            </View>

            {/* Medical warning */}
            {isMedical && (
              <View style={{ backgroundColor: c.danger + "20", borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: c.danger }}>
                <Text style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}>
                  ⚠️ Esto pausará la toma activa para registrar el evento médico
                </Text>
              </View>
            )}

            <BigButton title="💾 Guardar Cambios" onPress={handleSaveEdit} variant="primary" />

            <TouchableOpacity onPress={() => setEditStep("category")} style={{ minHeight: 48, justifyContent: "center" }}>
              <Text style={{ color: c.textDim, textAlign: "center", fontWeight: "600", fontSize: 14 }}>
                Cambiar tipo de evento
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            Alert.alert("Eliminar evento", "¿Estás seguro?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Eliminar", style: "destructive", onPress: () => {
                deleteEvent.mutate({ id, babyId: baby!.id }, {
                  onSuccess: () => router.back(),
                });
              }},
            ]);
          }}
          style={{ paddingVertical: 16, borderRadius: 99, alignItems: "center", borderWidth: 1, borderColor: c.danger, marginTop: 8 }}
        >
          <Text style={{ color: c.danger, fontWeight: "900", fontSize: 16 }}>🗑 Eliminar</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
