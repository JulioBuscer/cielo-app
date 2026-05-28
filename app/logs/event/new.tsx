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
  useEventTypes,
  useSaveTimelineEvent,
} from "@/src/hooks/useTimeline";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { useTheme } from "@/src/theme/useTheme";
import type { EventMetric } from "@/src/units/types";
import { getUnit, getUnitsByDimension } from "@/src/units/registry";
import { findBestUnit } from "@/src/units/helpers";
import { getCategoryLabel } from "@/src/utils/categories";

const MEDICAL_TYPES = ["medication", "temperature", "vomit"];

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
  const { data: eventTypes } = useEventTypes();
  const { data: activeFeeding } = useActiveFeedingSession(baby?.id);
  const pauseFeeding = usePauseFeeding();
  const saveEvent = useSaveTimelineEvent();

  const [selectedType, setSelectedType] = useState<string | null>(
    preselect ?? null
  );
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

  const metrics: EventMetric[] = useMemo(() => {
    if (!selectedType || !eventTypes) return [];
    const et = eventTypes.find((t) => t.id === selectedType);
    if (!et?.metrics) return [];
    try {
      const parsed = JSON.parse(et.metrics);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [selectedType, eventTypes]);

  // Auto-detect initial display units based on metric scale
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

  const isMedical = selectedType ? MEDICAL_TYPES.includes(selectedType) : false;

  const grouped = useMemo(() => {
    if (!eventTypes) return {};
    const map: Record<string, typeof eventTypes> = {};
    for (const et of eventTypes) {
      if (et.id === "diaper" || et.id === "note") continue;
      if (!map[et.category]) map[et.category] = [];
      map[et.category].push(et);
    }
    return map;
  }, [eventTypes]);

  const handleSave = async () => {
    if (!baby || !profile || !selectedType) return;
    setSaving(true);
    try {
      if (
        activeFeeding &&
        activeFeeding.status === "active" &&
        isMedical
      ) {
        await pauseFeeding.mutateAsync(activeFeeding);
      }

      const numericValues: Record<string, number> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v !== "") {
          const num = parseFloat(v);
          if (!isNaN(num)) {
            // Convert from display unit to metric's default unit
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
        eventTypeId: selectedType,
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
        {/* Step 1: Select type */}
        {!selectedType ? (
          <View style={{ gap: 16 }}>
            {Object.entries(grouped).map(([category, types]) => (
              <View key={category} style={{ gap: 8 }}>
                <Text
                  style={{
                    color: c.accent,
                    fontWeight: "800",
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {getCategoryLabel(category)}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {types.map((et) => (
                    <TouchableOpacity
                      key={et.id}
                      onPress={() => setSelectedType(et.id)}
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
                      <Text style={{ fontSize: 20 }}>{et.emoji}</Text>
                      <Text
                        style={{
                          color: c.textBody,
                          fontWeight: "700",
                          fontSize: 14,
                        }}
                      >
                        {et.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Selected type indicator */}
            <TouchableOpacity onPress={() => setSelectedType(null)}>
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
                <Text style={{ fontSize: 16 }}>
                  {eventTypes?.find((t) => t.id === selectedType)?.emoji}
                </Text>
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}
                >
                  {eventTypes?.find((t) => t.id === selectedType)?.label}
                </Text>
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
                <Text
                  style={{
                    color: c.accent,
                    fontWeight: "800",
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  📐 Mediciones
                </Text>
                {metrics.map((m) => {
                  const u = getUnit(m.unitId);
                  const compatible = u ? getUnitsByDimension(u.dimension) : [];
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
                      <Text
                        style={{
                          color: c.textMuted,
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        {m.name}{" "}
                        {m.unitId ? (
                          <Text style={{ color: c.textDim }}>({m.unitId})</Text>
                        ) : null}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                          <TextInput
                            value={values[m.id] ?? ""}
                            onChangeText={(v) =>
                              setValues((prev) => ({ ...prev, [m.id]: v }))
                            }
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
                            <Text
                              style={{
                                color: c.accent,
                                fontWeight: "800",
                                fontSize: 14,
                              }}
                            >
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
              <DateTimePicker
                value={timestamp}
                onChange={setTimestamp}
              />
            </View>

            {/* Medical warning */}
            {isMedical && (
              <View
                style={{
                  backgroundColor: c.danger + "20",
                  borderRadius: 12,
                  padding: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: c.danger,
                }}
              >
                <Text
                  style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}
                >
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

            <TouchableOpacity onPress={() => setSelectedType(null)} style={{ minHeight: 48, justifyContent: "center" }}>
              <Text
                style={{
                  color: c.textDim,
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
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
