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
  useSleepSession,
  useSleepStatusEvents,
  useUpdateSleepSession,
  useSleepPreciseElapsed,
} from "@/src/hooks/useSleepSessions";
import { formatDuration } from "@/src/db/client";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { useActiveProfile } from "@/src/hooks/useProfile";

function formatDateTime(ts: Date | string | number | undefined | null): string {
  if (!ts) return "--";
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hour}:${min}`;
}

export default function SleepDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSleepSession(id);
  const { data: statusEvents } = useSleepStatusEvents(id);
  const { data: profile } = useActiveProfile();
  const updateSleep = useUpdateSleepSession();
  const preciseElapsed = session ? useSleepPreciseElapsed(session) : 0;

  const [editing, setEditing] = useState(false);
  const [editStartedAt, setEditStartedAt] = useState<Date | null>(null);
  const [editEndedAt, setEditEndedAt] = useState<Date | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const isOwn = session?.profileId === profile?.id;
  const isActive = session?.status === "active" || session?.status === "paused";

  const statusLabels: Record<string, { emoji: string; label: string }> = {
    start: { emoji: "🌙", label: "Inicio" },
    pause: { emoji: "⏸️", label: "Pausa" },
    resume: { emoji: "🌙", label: "Continuación" },
    finish: { emoji: "☀️", label: "Fin" },
  };

  const handleStartEditing = () => {
    if (!session) return;
    setEditStartedAt(new Date(session.startedAt));
    setEditEndedAt(session.endedAt ? new Date(session.endedAt) : null);
    setEditNotes(session.notes ?? "");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!session || !editStartedAt) return;
    try {
      await updateSleep.mutateAsync({
        id: session.id,
        babyId: session.babyId,
        startedAt: editStartedAt,
        endedAt: editEndedAt,
        notes: editNotes || null,
      });
      setEditing(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar la siesta");
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1A2E" }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#888", fontSize: 16 }}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const durationLabel = isActive
    ? formatDuration(preciseElapsed)
    : session.durationSec != null
      ? formatDuration(session.durationSec)
      : "--";

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
          😴 Detalle de Siesta
        </Text>
        <TouchableOpacity onPress={handleStartEditing}>
          <Text style={{ color: "#9B59B6", fontWeight: "700", fontSize: 14 }}>
            {editing ? "Cancelar" : "✏️"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 16 }}
      >
        {/* Session info card */}
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
            <Text style={{ color: "#9B59B6", fontWeight: "800", fontSize: 20 }}>
              😴 Sesión de Sueño
            </Text>
            <Text
              style={{
                color: isOwn ? "#4CAF50" : "#9B59B6",
                fontWeight: "700",
                fontSize: 12,
                backgroundColor: isOwn ? "#1A3A1A" : "#2A1A3E",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 99,
              }}
            >
              {isOwn ? "Tú" : "Otro cuidador"}
            </Text>
          </View>

          {isActive && (
            <View
              style={{
                backgroundColor: "#2A1A3E",
                borderRadius: 12,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#9B59B6", fontWeight: "700", fontSize: 13 }}>
                {session.status === "active" ? "🟢 En curso" : "🟡 En pausa"}
              </Text>
            </View>
          )}

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
                Inicio
              </Text>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                {editing
                  ? formatDateTime(editStartedAt!)
                  : formatDateTime(session.startedAt)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#888", fontWeight: "600", fontSize: 13 }}>
                Fin
              </Text>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                {editing
                  ? editEndedAt
                    ? formatDateTime(editEndedAt)
                    : "—"
                  : formatDateTime(session.endedAt)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#888", fontWeight: "600", fontSize: 13 }}>
                Duración
              </Text>
              <Text
                style={{
                  color: "#9B59B6",
                  fontWeight: "800",
                  fontSize: 18,
                }}
              >
                {durationLabel}
              </Text>
            </View>
          </View>
        </View>

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
                color: "#9B59B6",
                fontWeight: "800",
                fontSize: 15,
                textAlign: "center",
              }}
            >
              ✏️ Editar tiempos
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 12 }}>
                Inicio
              </Text>
              <DateTimePicker
                value={editStartedAt!}
                onChange={setEditStartedAt}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 12 }}>
                Fin
              </Text>
              <DateTimePicker
                value={editEndedAt ?? editStartedAt!}
                onChange={setEditEndedAt}
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

        {/* Status events timeline */}
        {statusEvents && statusEvents.length > 0 && (
          <View
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 16,
              padding: 20,
              gap: 12,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                fontSize: 15,
              }}
            >
              📋 Línea de tiempo
            </Text>

            {statusEvents.map((ev, i) => {
              const info =
                statusLabels[ev.type] ?? {
                  emoji: "•",
                  label: ev.type,
                };
              return (
                <View
                  key={ev.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <View style={{ alignItems: "center", width: 20 }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor:
                          ev.type === "start"
                            ? "#4CAF50"
                            : ev.type === "finish"
                              ? "#FF6B6B"
                              : "#9B59B6",
                      }}
                    />
                    {i < statusEvents.length - 1 && (
                      <View
                        style={{
                          width: 2,
                          flex: 1,
                          minHeight: 16,
                          backgroundColor: "#3A3A4E",
                        }}
                      />
                    )}
                  </View>

                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: i < statusEvents.length - 1 ? 8 : 0,
                    }}
                  >
                    <Text
                      style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}
                    >
                      {info.emoji} {info.label}
                    </Text>
                    <Text
                      style={{ color: "#888", fontWeight: "500", fontSize: 12 }}
                    >
                      {formatDateTime(ev.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Notes */}
        {!editing && session.notes && (
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
              {session.notes}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
