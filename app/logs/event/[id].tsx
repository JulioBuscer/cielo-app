import { useState } from "react";
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
import {
  useTimelineEvent,
  useEventTypes,
  useUpdateTimelineEvent,
  useDiaperObservations,
} from "@/src/hooks/useTimeline";
import { useActiveProfile } from "@/src/hooks/useProfile";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useCatalogItem } from "@/src/hooks/useCatalogItems";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { getZoneColor, getZoneLabel, parseMetrics, getMetricZoneColor, getMetricZoneLabel } from "@/src/db/schema";
import { useTheme } from "@/src/theme/useTheme";
import { getUnit, getUnitsByDimension, getUnitsForMetric } from "@/src/units/registry";
import { findBestUnit } from "@/src/units/helpers";
import type { EventMetric } from "@/src/units/types";

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
  const { data: diaperObs } = useDiaperObservations();
  const { data: catalogItem } = useCatalogItem(event?.eventItemId ?? undefined);

  const [editing, setEditing] = useState(false);
  const [editTimestamp, setEditTimestamp] = useState<Date>(new Date());
  const [editNotes, setEditNotes] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editDisplayUnits, setEditDisplayUnits] = useState<Record<string, string>>({});
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");

  const evType = eventTypes?.find((t) => t.id === event?.eventTypeId);
  const isOwn = event?.profileId === profile?.id;

  const evMetrics: EventMetric[] = catalogItem?.metrics
    ? (() => { try { const p = JSON.parse(catalogItem.metrics); return Array.isArray(p) ? p : []; } catch { return []; } })()
    : evType?.metrics
      ? (() => { try { const p = JSON.parse(evType.metrics); return Array.isArray(p) ? p : []; } catch { return []; } })()
      : [];

  const meta = event?.metadata
    ? (() => { try { return JSON.parse(event.metadata); } catch { return null; } })()
    : null;

  const resolvedEmoji = catalogItem?.emoji ?? evType?.emoji ?? meta?.presetEmoji ?? "📝";
  const resolvedLabel = catalogItem?.name ?? evType?.label ?? meta?.presetName ?? event?.eventTypeId ?? "Evento";

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

    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!event || !baby) return;
    try {
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

      await updateEvent.mutateAsync({
        id: event.id,
        babyId: baby.id,
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
              {(meta.foods as { id: string; emoji: string | null; name: string }[]).map((f) => (
                <View key={f.id} style={{
                  backgroundColor: c.surface, borderRadius: 99,
                  paddingVertical: 4, paddingHorizontal: 10,
                }}>
                  <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13 }}>
                    {f.emoji ?? ""} {f.name}
                  </Text>
                </View>
              ))}
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

        {/* Edit mode */}
        {editing && (
          <View className="rounded-2xl p-5 gap-4" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px] text-center" style={{ color: c.accent }}>✏️ Editar evento</Text>

            <View style={{ gap: 6 }}>
              <Text className="font-bold text-xs" style={{ color: c.textMuted }}>Fecha y hora</Text>
              <DateTimePicker value={editTimestamp} onChange={setEditTimestamp} />
            </View>

            {evMetrics.length > 0 && (
              <View style={{ gap: 12 }}>
                <Text className="font-bold text-xs" style={{ color: c.textMuted }}>📐 Mediciones</Text>
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
                        {m.name}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <TextInput
                          value={editValues[m.id] ?? ""}
                          onChangeText={(v) => setEditValues((prev) => ({ ...prev, [m.id]: v }))}
                          placeholder="0"
                          placeholderTextColor={c.textDim}
                          keyboardType="decimal-pad"
                          style={{
                            flex: 1,
                            backgroundColor: c.surface,
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
                              backgroundColor: c.surface,
                              borderRadius: 12,
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                            }}
                          >
                            <Text style={{ color: c.accent, fontWeight: "700", fontSize: 13 }}>
                              {displayUnit?.symbol || displayUnit?.name || m.unitId}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

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
                    flex: 1,
                    backgroundColor: c.surface,
                    borderRadius: 10,
                    padding: 10,
                    color: c.textBody,
                    fontSize: 14,
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
                        backgroundColor: c.surface, borderRadius: 99,
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

            <View style={{ gap: 6 }}>
              <Text className="font-bold text-xs" style={{ color: c.textMuted }}>📝 Notas</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Agregar nota..."
                placeholderTextColor={c.textMuted}
                multiline
                className="rounded-xl p-3.5 text-[15px]"
                style={{ backgroundColor: c.surface, color: c.textBody, minHeight: 60, textAlignVertical: "top" }}
              />
            </View>

            <BigButton title="💾 Guardar Cambios" onPress={handleSaveEdit} variant="primary" />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
