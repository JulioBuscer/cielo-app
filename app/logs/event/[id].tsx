import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
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
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { getZoneColor, getZoneLabel, parseMetrics, getMetricZoneColor, getMetricZoneLabel, getMetricZoneEmoji } from "@/src/db/schema";
import { useTheme } from "@/src/theme/useTheme";

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

  const [editing, setEditing] = useState(false);
  const [editTimestamp, setEditTimestamp] = useState<Date>(new Date());
  const [editNotes, setEditNotes] = useState("");

  const evType = eventTypes?.find((t) => t.id === event?.eventTypeId);
  const isOwn = event?.profileId === profile?.id;

  const handleStartEditing = () => {
    if (!event) return;
    setEditTimestamp(new Date(event.timestamp));
    setEditNotes(event.notes ?? "");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!event || !baby) return;
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        babyId: baby.id,
        timestamp: editTimestamp,
        notes: editNotes || null,
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

  const { data: diaperObs } = useDiaperObservations();

  let metadataDisplay: { label: string; value: string; color?: string }[] = [];
  if (event.metadata) {
    try {
      const meta = JSON.parse(event.metadata);
      if (meta.weightGrams != null)
        metadataDisplay.push({ label: "Peso pañal", value: `${meta.weightGrams}g` });
      if (meta.heightMm != null)
        metadataDisplay.push({ label: "Estatura", value: `${(meta.heightMm / 10).toFixed(1)} cm` });
      if (meta.headCircMm != null)
        metadataDisplay.push({ label: "C. Cefálica", value: `${(meta.headCircMm / 10).toFixed(1)} cm` });
      if (meta.celsius != null)
        metadataDisplay.push({ label: "Temperatura", value: `${meta.celsius}°C` });
      if (meta.medicineName)
        metadataDisplay.push({
          label: "Medicamento",
          value: meta.dose ? `${meta.medicineName} (${meta.dose})` : meta.medicineName,
        });
      if (meta.peeIntensity > 0 || meta.poopIntensity > 0) {
        const parts: string[] = [];
        if (meta.peeIntensity > 0) parts.push(`💦 ${meta.peeIntensity}`);
        if (meta.poopIntensity > 0) parts.push(`💩 ${meta.poopIntensity}`);
        metadataDisplay.push({ label: "Pañal", value: parts.join(" · ") });
      }
      if (meta.peeHealth != null && meta.peeHealth > 0) {
        const obs = diaperObs?.find((o) => o.id === "pee_health");
        metadataDisplay.push({ label: "💧 Pipí (color)", value: `🧪 ${meta.peeHealth}`, color: c.growth });
      }
      if (meta.poopHealth != null && meta.poopHealth > 0) {
        metadataDisplay.push({ label: "💩 Popó (color)", value: `🧪 ${meta.poopHealth}`, color: c.biological.poop });
      }
      if (meta.observationValues && typeof meta.observationValues === "object") {
        for (const [obsId, valOrMetrics] of Object.entries(meta.observationValues)) {
          const obs = diaperObs?.find((o) => o.id === obsId);
          if (typeof valOrMetrics === "object" && valOrMetrics !== null) {
            const metrics = obs ? parseMetrics(obs.metrics) : [];
            for (const [metricId, mVal] of Object.entries(valOrMetrics as Record<string, number>)) {
              const metric = metrics.find((m) => m.id === metricId);
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
      if (meta.observationIds?.length > 0) {
        const names = meta.observationIds
          .map((id: string) => {
            const o = diaperObs?.find((x) => x.id === id);
            return o ? `${o.emoji} ${o.label}` : id;
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
          {evType?.emoji ?? "📝"} {evType?.label ?? "Evento"}
        </Text>
        <TouchableOpacity onPress={handleStartEditing}>
          <Text className="font-bold text-sm" style={{ color: c.accent }}>
            {editing ? "Cancelar" : "✏️"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Event info card */}
        <View className="rounded-2xl p-5 gap-3" style={{ backgroundColor: c.card }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text className="font-black text-[22px]" style={{ color: c.textBody }}>
              {evType?.emoji ?? "📝"}
            </Text>
            <Text
              className="font-bold text-xs px-2.5 py-1 rounded-full"
              style={{
                color: isOwn ? c.success : c.accent,
                backgroundColor: isOwn ? `${c.success}20` : c.accentLight,
              }}
            >
              {isOwn ? "Tú" : "Otro cuidador"}
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
                  {evType?.emoji} {evType?.label ?? event.eventTypeId}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Metadata display */}
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

        {/* Notes */}
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
    </SafeAreaView>
  );
}
