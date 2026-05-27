import { useState, useEffect, useMemo } from "react";
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
import { KEYS } from "@/src/utils/storage";
import { BigButton } from "@/src/components/ui/BigButton";
import {
  useEventTypes,
  useDiaperObservations,
  useCreateEventType,
  useCreateDiaperObservation,
  useUpdateDiaperObservation,
  useDeleteEventType,
  useUpdateEventTypeMetrics,
  useDeleteDiaperObservation,
} from "@/src/hooks/useTimeline";
import {
  useEventPresets,
  useCreateEventPreset,
  useUpdateEventPreset,
  useDeleteEventPreset,
} from "@/src/hooks/useEventPresets";

import { useTheme } from "@/src/theme/useTheme";
import type { DiaperObservation, ObservationMetric } from "@/src/db/schema";
import type { EventType, EventPreset } from "@/src/db/schema";
import type { EventMetric } from "@/src/units/types";
import { getUnit, getUnitsByDimension } from "@/src/units/registry";
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
  const { data: events } = useEventTypes();
  const { data: diaperObs } = useDiaperObservations();
  const { data: presets } = useEventPresets();
  const createPreset = useCreateEventPreset();
  const updatePreset = useUpdateEventPreset();
  const deletePreset = useDeleteEventPreset();
  const createEvent = useCreateEventType();
  const createDiaper = useCreateDiaperObservation();
  const updateDiaper = useUpdateDiaperObservation();

  const [activeTab, setActiveTab] = useState<"events" | "pee" | "poop" | "obs" | "presets">("events");
  const [showForm, setShowForm] = useState(false);
  const [editingObs, setEditingObs] = useState<DiaperObservation | null>(null);
  const [editingEventMetrics, setEditingEventMetrics] = useState<EventType | null>(null);

  // ─── Preset form state ───
  const [presetForm, setPresetForm] = useState(false);
  const [presetEdit, setPresetEdit] = useState<EventPreset | null>(null);
  const [pfName, setPfName] = useState("");
  const [pfEmoji, setPfEmoji] = useState("📌");
  const [pfEventType, setPfEventType] = useState("");
  const [pfMetricValues, setPfMetricValues] = useState<Record<string, string>>({});
  const [pfMetricUnits, setPfMetricUnits] = useState<Record<string, string>>({});
  const [pfNotes, setPfNotes] = useState("");
  const [pfQuick, setPfQuick] = useState(false);

  const selectedEvent = events?.find((e) => e.id === pfEventType);
  const selectedMetrics: EventMetric[] = (() => {
    if (!selectedEvent?.metrics) return [];
    try { const p = JSON.parse(selectedEvent.metrics); return Array.isArray(p) ? p : []; } catch { return []; }
  })();

  const resetPresetForm = () => {
    setPfName("");
    setPfEmoji("📌");
    setPfEventType("");
    setPfMetricValues({});
    setPfMetricUnits({});
    setPfNotes("");
    setPfQuick(false);
  };

  const openPresetForm = (p?: EventPreset) => {
    if (p) {
      setPresetEdit(p);
      setPfName(p.name);
      setPfEmoji(p.emoji ?? "📌");
      setPfEventType(p.eventTypeId);
      const vals: Record<string, string> = {};
      const units: Record<string, string> = {};
      try {
        const dv = JSON.parse(p.defaultValues ?? "{}");
        for (const [k, v] of Object.entries(dv)) vals[k] = String(v);
      } catch {}
      try {
        const duo = JSON.parse(p.defaultUnitOverrides ?? "{}");
        for (const [k, v] of Object.entries(duo)) units[k] = String(v);
      } catch {}
      setPfMetricValues(vals);
      setPfMetricUnits(units);
      setPfNotes(p.defaultNotes ?? "");
      setPfQuick(p.isQuickAction ?? false);
    } else {
      setPresetEdit(null);
      resetPresetForm();
    }
    setPresetForm(true);
  };

  const handleSavePreset = async () => {
    if (!pfName.trim() || !pfEventType) return;
    const dv: Record<string, number> = {};
    for (const [k, v] of Object.entries(pfMetricValues)) {
      const n = parseFloat(v);
      if (!isNaN(n)) dv[k] = n;
    }
    try {
      if (presetEdit) {
        await updatePreset.mutateAsync({
          id: presetEdit.id,
          name: pfName.trim(),
          emoji: pfEmoji,
          defaultValues: dv,
          defaultUnitOverrides: pfMetricUnits,
          defaultNotes: pfNotes || undefined,
          isQuickAction: pfQuick,
        });
      } else {
        await createPreset.mutateAsync({
          eventTypeId: pfEventType,
          name: pfName.trim(),
          emoji: pfEmoji,
          defaultValues: dv,
          defaultUnitOverrides: pfMetricUnits,
          defaultNotes: pfNotes || undefined,
          isQuickAction: pfQuick,
        });
      }
      setPresetForm(false);
      setPresetEdit(null);
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar la plantilla");
    }
  };

  const handleDeletePreset = (id: string) => {
    Alert.alert("Eliminar plantilla", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deletePreset.mutate(id) },
    ]);
  };

  const cycleMetricUnit = (metricId: string) => {
    const metric = selectedMetrics.find((m) => m.id === metricId);
    if (!metric) return;
    const compatible = getUnitsByDimension(getUnit(metric.unitId)?.dimension ?? "dimensionless");
    const current = pfMetricUnits[metricId] ?? metric.unitId;
    const idx = compatible.findIndex((u) => u.id === current);
    const next = compatible[(idx + 1) % compatible.length];
    if (next) setPfMetricUnits((p) => ({ ...p, [metricId]: next.id }));
  };

  useEffect(() => {
    setPfMetricValues({});
    setPfMetricUnits({});
  }, [pfEventType]);

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

  const { mutate: deleteEventType } = useDeleteEventType();
  const { mutate: saveEventMetrics } = useUpdateEventTypeMetrics();
  const { mutate: deleteDiaperObs } = useDeleteDiaperObservation();

  const handleDeleteEvent = async (id: string, isSystem: boolean | null) => {
    if (isSystem)
      return Alert.alert("Ups", "No puedes borrar un tipo del sistema.");
    Alert.alert("Confirmar", "¿Borrar este tipo de evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: () => deleteEventType(id),
      },
    ]);
  };

  const handleSaveEventMetrics = async (id: string, metrics: EventMetric[]) => {
    saveEventMetrics({ id, metrics: JSON.stringify(metrics) });
    setEditingEventMetrics(null);
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
      createDiaper.mutate(data, { onSuccess: () => setShowForm(false) });
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
            { key: "events" as const, label: "📝 Eventos" },
            { key: "pee" as const, label: "💧 Pipí" },
            { key: "poop" as const, label: "💩 Popó" },
            { key: "obs" as const, label: "🧷 Obs. Pañal" },
            { key: "presets" as const, label: "📌 Plantillas" },
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

        {showForm || editingObs ? (
          <View
            style={{
              flex: 1,
              backgroundColor: c.surface,
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
        ) : editingEventMetrics ? (
          <View
            style={{
              flex: 1,
              backgroundColor: c.surface,
            }}
          >
            <EventMetricsEditor
              eventType={editingEventMetrics}
              onSave={(metrics) =>
                handleSaveEventMetrics(editingEventMetrics.id, metrics)
              }
              onCancel={() => setEditingEventMetrics(null)}
            />
          </View>
        ) : (
          <ScrollView
            className="flex-1" style={{ backgroundColor: c.surface }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Events Tab ─── */}
            {activeTab === "events" && (
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
                        color: c.textMuted,
                        marginBottom: 4,
                      }}
                    >
                      EMOJI
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 20,
                        textAlign: "center",
                        color: c.textBody,
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
                        color: c.textMuted,
                        marginBottom: 4,
                      }}
                    >
                      NOMBRE
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 15,
                        color: c.textBody,
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
                      color: c.textMuted,
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
                            category === cat ? c.elevated : c.surface,
                          borderColor:
                            category === cat ? c.accentStrong : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color:
                              category === cat ? c.accentStrong : c.textMuted,
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
                  {events?.map((item) => {
                    const parsedMetrics: EventMetric[] = item.metrics
                      ? safeJsonParse(item.metrics, [] as EventMetric[])
                      : [];
                    return (
                      <View
                        key={item.id}
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
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              {!!item.isSystem && (
                                <Text
                                  style={{
                                    fontSize: 10,
                                    color: c.accentStrong,
                                    fontWeight: "800",
                                  }}
                                >
                                  SISTEMA
                                </Text>
                              )}
                              {parsedMetrics.length > 0 && (
                                <Text
                                  style={{
                                    fontSize: 10,
                                    color: c.whatsGreen,
                                    fontWeight: "800",
                                  }}
                                >
                                  ⚙️ {parsedMetrics.length} métrica
                                  {parsedMetrics.length > 1 ? "s" : ""}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => setEditingEventMetrics(item)}
                          >
                            <Text style={{ color: c.accent, fontSize: 16 }}>
                              ✏️
                            </Text>
                          </TouchableOpacity>
                          {!item.isSystem && (
                            <TouchableOpacity
                              onPress={() =>
                                handleDeleteEvent(item.id, item.isSystem)
                              }
                            >
                              <Text style={{ color: c.danger, fontSize: 16 }}>
                                🗑️
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
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
                      onPress={() => setShowForm(true)}
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

            {activeTab === "presets" && !presetForm && (
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
                    Plantillas ({presets?.length || 0})
                  </Text>
                  <TouchableOpacity
                    onPress={() => openPresetForm()}
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
                  {presets?.map((p) => {
                    const et = events?.find((e) => e.id === p.eventTypeId);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => openPresetForm(p)}
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
                          <Text style={{ fontSize: 24 }}>{p.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: "800",
                                color: c.textBody,
                              }}
                            >
                              {p.name}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                color: c.textMuted,
                                fontWeight: "600",
                              }}
                            >
                              {et?.emoji} {et?.label ?? p.eventTypeId}
                              {p.isQuickAction ? " · ⚡ Acceso directo" : ""}
                            </Text>
                          </View>
                          <Text style={{ color: c.textMuted, fontSize: 14 }}>
                            ✏️
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeletePreset(p.id)}>
                          <Text style={{ color: c.danger, fontSize: 18 }}>🗑️</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                  {(presets?.length ?? 0) === 0 && (
                    <Text style={{ color: c.textDim, fontSize: 14, textAlign: "center", padding: 20 }}>
                      Crea tu primera plantilla para acceder rápido a medicamentos, síntomas o eventos recurrentes
                    </Text>
                  )}
                </View>
              </View>
            )}

            {activeTab === "presets" && presetForm && (
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
                  {presetEdit ? "Editar plantilla" : "Nueva plantilla"}
                </Text>

                <View style={{ gap: 12 }}>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Emoji</Text>
                    <TextInput
                      value={pfEmoji}
                      onChangeText={setPfEmoji}
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
                      value={pfName}
                      onChangeText={setPfName}
                      placeholder="Ej: OneDrop, Paracetamol..."
                      placeholderTextColor={c.textDim}
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12, padding: 12,
                        color: c.textBody, fontSize: 15,
                      }}
                    />
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Tipo de evento</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {events?.filter((e) => e.id !== "note" && e.id !== "diaper").map((et) => (
                        <TouchableOpacity
                          key={et.id}
                          onPress={() => setPfEventType(et.id)}
                          style={{
                            paddingVertical: 8, paddingHorizontal: 12,
                            borderRadius: 99,
                            backgroundColor: pfEventType === et.id ? c.accent : c.surface,
                            minHeight: 36,
                          }}
                        >
                          <Text style={{
                            color: pfEventType === et.id ? "#FFF" : c.textBody,
                            fontWeight: "700", fontSize: 13,
                          }}>
                            {et.emoji} {et.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {pfEventType && selectedMetrics.length > 0 && (
                    <View style={{ gap: 12 }}>
                      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                        Valores por defecto
                      </Text>
                      {selectedMetrics.map((m) => {
                        const u = getUnit(pfMetricUnits[m.id] ?? m.unitId);
                        const compatible = u ? getUnitsByDimension(u.dimension) : [];
                        return (
                          <View key={m.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                            <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13, minWidth: 80 }}>
                              {m.name}
                            </Text>
                            <TextInput
                              value={pfMetricValues[m.id] ?? ""}
                              onChangeText={(t) => setPfMetricValues((p) => ({ ...p, [m.id]: t.replace(/[^0-9.]/g, "") }))}
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
                        Toca la unidad para cambiarla (mL → gotas → sobre)
                      </Text>
                    </View>
                  )}

                  {pfEventType && selectedMetrics.length === 0 && (
                    <Text style={{ color: c.textDim, fontSize: 13, fontStyle: "italic" }}>
                      Este tipo de evento no tiene valores numéricos configurables.
                    </Text>
                  )}

                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Notas por defecto</Text>
                    <TextInput
                      value={pfNotes}
                      onChangeText={setPfNotes}
                      placeholder="Notas que se pre-cargarán al usar la plantilla"
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

                  <TouchableOpacity
                    onPress={() => setPfQuick(!pfQuick)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <View style={{
                      width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                      borderColor: pfQuick ? c.accent : c.textDim,
                      backgroundColor: pfQuick ? c.accent : "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {pfQuick && <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>✓</Text>}
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
                        onPress={() => { setPresetForm(false); setPresetEdit(null); }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <BigButton
                        label="Guardar"
                        onPress={handleSavePreset}
                        loading={createPreset.isPending || updatePreset.isPending}
                        disabled={!pfName.trim() || !pfEventType}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {activeTab !== "obs" && activeTab !== "presets" && (
              <View style={{ marginTop: 12 }}>
                <BigButton label="💾 Guardar configuración" onPress={saveAllConfigs} />
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
