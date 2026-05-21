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
} from "@/src/hooks/useTimeline";
import { useActiveProfile } from "@/src/hooks/useProfile";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";

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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1A2E" }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#888", fontSize: 16 }}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  let metadataDisplay: { label: string; value: string }[] = [];
  if (event.metadata) {
    try {
      const meta = JSON.parse(event.metadata);
      if (meta.weightGrams != null)
        metadataDisplay.push({
          label: "Peso",
          value: `${(meta.weightGrams / 1000).toFixed(3)} kg`,
        });
      if (meta.heightMm != null)
        metadataDisplay.push({
          label: "Estatura",
          value: `${(meta.heightMm / 10).toFixed(1)} cm`,
        });
      if (meta.headCircMm != null)
        metadataDisplay.push({
          label: "C. Cefálica",
          value: `${(meta.headCircMm / 10).toFixed(1)} cm`,
        });
      if (meta.celsius != null)
        metadataDisplay.push({
          label: "Temperatura",
          value: `${meta.celsius}°C`,
        });
      if (meta.medicineName)
        metadataDisplay.push({
          label: "Medicamento",
          value: meta.dose
            ? `${meta.medicineName} (${meta.dose})`
            : meta.medicineName,
        });
      if (meta.peeIntensity != null || meta.poopIntensity != null) {
        const parts: string[] = [];
        if (meta.peeIntensity > 0)
          parts.push(`💦 ${meta.peeIntensity}/5`);
        if (meta.poopIntensity > 0)
          parts.push(`💩 ${meta.poopIntensity}/5`);
        metadataDisplay.push({ label: "Pañal", value: parts.join(" · ") });
      }
    } catch {}
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1A2E" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#1A1A2E",
          borderBottomWidth: 1,
          borderBottomColor: "#2A2A3E",
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "900",
            color: "#FFFFFF",
          }}
        >
          {evType?.emoji ?? "📝"} {evType?.label ?? "Evento"}
        </Text>
        <TouchableOpacity onPress={handleStartEditing}>
          <Text style={{ color: "#FF8AB3", fontWeight: "700", fontSize: 14 }}>
            {editing ? "Cancelar" : "✏️"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 16 }}
      >
        {/* Event info card */}
        <View
          style={{
            backgroundColor: "#2A2A3E",
            borderRadius: 16,
            padding: 20,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 22 }}>
              {evType?.emoji ?? "📝"}
            </Text>
            <Text
              style={{
                color: isOwn ? "#4CAF50" : "#FF8AB3",
                fontWeight: "700",
                fontSize: 12,
                backgroundColor: isOwn ? "#1A3A1A" : "#3A1A2E",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 99,
              }}
            >
              {isOwn ? "Tú" : "Otro cuidador"}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#1A1A2E",
              borderRadius: 12,
              padding: 14,
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#888", fontWeight: "600", fontSize: 13 }}>
                Fecha y hora
              </Text>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                {editing
                  ? formatDateTime(editTimestamp)
                  : formatDateTime(event.timestamp)}
              </Text>
            </View>
            {event.eventTypeId && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: "#888", fontWeight: "600", fontSize: 13 }}>
                  Tipo
                </Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                  {evType?.emoji} {evType?.label ?? event.eventTypeId}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Metadata display */}
        {metadataDisplay.length > 0 && !editing && (
          <View
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 16,
              padding: 20,
              gap: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>
              📊 Detalles
            </Text>
            {metadataDisplay.map((m, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                  borderBottomWidth: i < metadataDisplay.length - 1 ? 1 : 0,
                  borderBottomColor: "#2A2A3E",
                }}
              >
                <Text
                  style={{ color: "#BBBBBB", fontWeight: "600", fontSize: 14 }}
                >
                  {m.label}
                </Text>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  {m.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {!editing && event.notes && (
          <View
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 16,
              padding: 20,
              gap: 6,
            }}
          >
            <Text style={{ color: "#888", fontWeight: "700", fontSize: 12 }}>
              📝 Notas
            </Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "500", fontSize: 14 }}>
              {event.notes}
            </Text>
          </View>
        )}

        {/* Edit mode */}
        {editing && (
          <View
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 16,
              padding: 20,
              gap: 16,
            }}
          >
            <Text
              style={{
                color: "#FF8AB3",
                fontWeight: "800",
                fontSize: 15,
                textAlign: "center",
              }}
            >
              ✏️ Editar evento
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 12 }}>
                Fecha y hora
              </Text>
              <DateTimePicker
                value={editTimestamp}
                onChange={setEditTimestamp}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 12 }}>
                📝 Notas
              </Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Agregar nota..."
                placeholderTextColor="#666"
                multiline
                style={{
                  backgroundColor: "#1A1A2E",
                  borderRadius: 12,
                  padding: 14,
                  color: "#FFFFFF",
                  fontSize: 15,
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <BigButton
              title="💾 Guardar Cambios"
              onPress={handleSaveEdit}
              variant="primary"
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
