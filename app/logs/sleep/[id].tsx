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
  useSleepSession,
  useSleepStatusEvents,
  useUpdateSleepSession,
  useSleepPreciseElapsed,
} from "@/src/hooks/useSleepSessions";
import { formatDuration } from "@/src/db/client";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { useActiveProfile } from "@/src/hooks/useProfile";
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

export default function SleepDetailScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSleepSession(id);
  const { data: statusEvents } = useSleepStatusEvents(id);
  const { data: profile } = useActiveProfile();
  const updateSleep = useUpdateSleepSession();
  const preciseElapsed = useSleepPreciseElapsed(session);
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
        notes: editNotes ?? undefined,
      });
      setEditing(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar la siesta");
    }
  };

  if (!session) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: c.surface }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text className="text-base" style={{ color: c.textDim }}>Cargando...</Text>
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: c.surface, borderBottomColor: c.elevated }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-black" style={{ color: c.textBody }}>
          😴 Detalle de Siesta
        </Text>
        <TouchableOpacity onPress={handleStartEditing}>
          <Text style={{ color: c.accent, fontWeight: "700", fontSize: 14 }}>
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
        {/* Session info card */}
        <View className="rounded-2xl p-5 gap-3" style={{ backgroundColor: c.card }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: c.accent, fontWeight: "800", fontSize: 20 }}>
              😴 Sesión de Sueño
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

          {isActive && (
            <View className="rounded-xl p-2.5 items-center" style={{ backgroundColor: c.accentLight }}>
              <Text style={{ color: c.accent, fontWeight: "700", fontSize: 13 }}>
                {session.status === "active" ? "🟢 En curso" : "🟡 En pausa"}
              </Text>
            </View>
          )}

          <View className="rounded-xl p-3.5 gap-2" style={{ backgroundColor: c.surface }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text className="font-semibold text-[13px]" style={{ color: c.textDim }}>Inicio</Text>
              <Text className="font-bold text-sm" style={{ color: c.textBody }}>
                {editing ? formatDateTime(editStartedAt!) : formatDateTime(session.startedAt)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text className="font-semibold text-[13px]" style={{ color: c.textDim }}>Fin</Text>
              <Text className="font-bold text-sm" style={{ color: c.textBody }}>
                {editing ? (editEndedAt ? formatDateTime(editEndedAt) : "—") : formatDateTime(session.endedAt)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text className="font-semibold text-[13px]" style={{ color: c.textDim }}>Duración</Text>
              <Text style={{ color: c.accent, fontWeight: "800", fontSize: 18 }}>{durationLabel}</Text>
            </View>
          </View>
        </View>

        {/* Edit mode */}
        {editing && (
          <View className="rounded-2xl p-5 gap-4" style={{ backgroundColor: c.card }}>
            <Text style={{ color: c.accent, fontWeight: "800", fontSize: 15, textAlign: "center" }}>
              ✏️ Editar tiempos
            </Text>

            <View style={{ gap: 6 }}>
              <Text className="font-bold text-xs" style={{ color: c.textMuted }}>Inicio</Text>
              <DateTimePicker value={editStartedAt!} onChange={setEditStartedAt} />
            </View>

            <View style={{ gap: 6 }}>
              <Text className="font-bold text-xs" style={{ color: c.textMuted }}>Fin</Text>
              <DateTimePicker value={editEndedAt ?? editStartedAt!} onChange={setEditEndedAt} />
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

        {/* Status events timeline */}
        {statusEvents && statusEvents.length > 0 && (
          <View className="rounded-2xl p-5 gap-3" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px]" style={{ color: c.textBody }}>📋 Línea de tiempo</Text>

            {statusEvents.map((ev, i) => {
              const info = statusLabels[ev.type] ?? { emoji: "•", label: ev.type };
              return (
                <View key={ev.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ alignItems: "center", width: 20 }}>
                    <View
                      style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: ev.type === "start" ? c.success : ev.type === "finish" ? c.danger : c.accent,
                      }}
                    />
                    {i < statusEvents.length - 1 && (
                      <View style={{ width: 2, flex: 1, minHeight: 16, backgroundColor: c.elevated }} />
                    )}
                  </View>

                  <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: i < statusEvents.length - 1 ? 8 : 0 }}>
                    <Text className="font-semibold text-sm" style={{ color: c.textBody }}>
                      {info.emoji} {info.label}
                    </Text>
                    <Text className="font-medium text-xs" style={{ color: c.textDim }}>
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
          <View className="rounded-2xl p-5 gap-1.5" style={{ backgroundColor: c.card }}>
            <Text className="font-bold text-xs" style={{ color: c.textDim }}>📝 Notas</Text>
            <Text className="font-medium text-sm" style={{ color: c.textBody }}>{session.notes}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
