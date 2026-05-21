import { useState, useMemo } from "react";
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

const MEDICAL_TYPES = ["medication", "temperature", "vomit"];

export default function EventNewScreen() {
  const { preselect } = useLocalSearchParams<{ preselect?: string }>();
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: eventTypes } = useEventTypes();
  const { data: activeFeeding } = useActiveFeedingSession(baby?.id);
  const pauseFeeding = usePauseFeeding();
  const saveEvent = useSaveTimelineEvent();

  const [selectedType, setSelectedType] = useState<string | null>(
    preselect ?? null
  );
  const [notes, setNotes] = useState("");
  const [timestamp, setTimestamp] = useState(new Date());
  const [saving, setSaving] = useState(false);

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

  const CATEGORY_LABELS: Record<string, string> = {
    feeding: "🤱 Alimentación",
    health: "💊 Salud",
    growth: "📏 Crecimiento",
    other: "📌 Otros",
  };

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

      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: selectedType,
        notes: notes.trim() || undefined,
        timestamp,
        feedingSessionId: activeFeeding?.id,
      });

      router.back();
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar el evento");
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={{ fontSize: 24 }}>✕</Text>
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
          📝 Nuevo Evento
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        {/* Step 1: Select type */}
        {!selectedType ? (
          <View style={{ gap: 16 }}>
            {Object.entries(grouped).map(([category, types]) => (
              <View key={category} style={{ gap: 8 }}>
                <Text
                  style={{
                    color: "#FF8AB3",
                    fontWeight: "800",
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {CATEGORY_LABELS[category] ?? category}
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
                        paddingVertical: 10,
                        borderRadius: 99,
                        backgroundColor: "#2A2A3E",
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{et.emoji}</Text>
                      <Text
                        style={{
                          color: "#FFFFFF",
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
                  backgroundColor: "#FF8AB3",
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
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>
                  ✕
                </Text>
              </View>
            </TouchableOpacity>

            {/* Notes */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
                📝 Notas
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Agregar nota..."
                placeholderTextColor="#666"
                multiline
                style={{
                  backgroundColor: "#2A2A3E",
                  borderRadius: 12,
                  padding: 14,
                  color: "#FFFFFF",
                  fontSize: 15,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Date & Time */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
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
                  backgroundColor: "#3A0000",
                  borderRadius: 12,
                  padding: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: "#FF0000",
                }}
              >
                <Text
                  style={{ color: "#FF6B6B", fontWeight: "700", fontSize: 13 }}
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

            <TouchableOpacity onPress={() => setSelectedType(null)}>
              <Text
                style={{
                  color: "#888",
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
    </SafeAreaView>
  );
}
