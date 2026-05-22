import { useMemo, useState } from "react";
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
  useFeedingSession,
  useFeedingStatusEvents,
  useUpdateFeedingSession,
  FEEDING_LABELS,
  BOTTLE_SUBTYPE_LABELS,
  type FeedingType,
  type BottleSubtype,
} from "@/src/hooks/useFeedingSessions";
import { formatDuration } from "@/src/db/client";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import { useActiveProfile } from "@/src/hooks/useProfile";
import { useTheme } from "@/src/theme/useTheme";

function formatTime(ts: Date | string | number | undefined | null): string {
  if (!ts) return "--:--";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateTime(ts: Date | string | number | undefined | null): string {
  if (!ts) return "--";
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hour}:${min}`;
}

export default function FeedingDetailScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useFeedingSession(id);
  const { data: statusEvents } = useFeedingStatusEvents(id);
  const { data: profile } = useActiveProfile();
  const updateFeeding = useUpdateFeedingSession();

  const [editing, setEditing] = useState(false);
  const [editStartedAt, setEditStartedAt] = useState<Date | null>(null);
  const [editEndedAt, setEditEndedAt] = useState<Date | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const typeInfo = session ? FEEDING_LABELS[session.type as FeedingType] : null;
  const subTypeInfo =
    session?.bottleSubtype
      ? BOTTLE_SUBTYPE_LABELS[session.bottleSubtype as BottleSubtype]
      : null;
  const isOwn = session?.profileId === profile?.id;

  const statusLabels: Record<string, { emoji: string; label: string }> = {
    start: { emoji: "▶️", label: "Inicio" },
    pause: { emoji: "⏸️", label: "Pausa" },
    resume: { emoji: "▶️", label: "Continuación" },
    finish: { emoji: "⏹️", label: "Fin" },
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
      await updateFeeding.mutateAsync({
        id: session.id,
        babyId: session.babyId,
        startedAt: editStartedAt,
        endedAt: editEndedAt,
        notes: editNotes || null,
      });
      setEditing(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar la toma");
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

  const durationLabel =
    editing && editStartedAt && editEndedAt
      ? formatDuration(Math.round((editEndedAt.getTime() - editStartedAt.getTime()) / 1000))
      : session.durationSec != null
        ? formatDuration(session.durationSec)
        : "En curso...";

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: c.surface, borderBottomColor: c.elevated }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-black" style={{ color: c.textBody }}>
          {typeInfo?.emoji ?? "🍼"} Detalle de Toma
        </Text>
        <TouchableOpacity onPress={handleStartEditing}>
          <Text className="font-bold text-sm" style={{ color: c.accent }}>
            {editing ? "Cancelar" : "✏️"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Session info card */}
        <View className="rounded-2xl p-5 gap-3" style={{ backgroundColor: c.card }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text className="font-black text-xl" style={{ color: c.accent }}>
              {typeInfo?.emoji} {typeInfo?.label}
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

          {subTypeInfo && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 14 }}>{subTypeInfo.emoji}</Text>
              <Text className="font-semibold text-sm" style={{ color: c.textMuted }}>{subTypeInfo.label}</Text>
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
                {editing
                  ? editEndedAt ? formatDateTime(editEndedAt) : "—"
                  : formatDateTime(session.endedAt)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text className="font-semibold text-[13px]" style={{ color: c.textDim }}>Duración</Text>
              <Text className="font-black text-lg" style={{ color: c.accent }}>{durationLabel}</Text>
            </View>
          </View>
        </View>

        {/* Edit mode */}
        {editing && (
          <View className="rounded-2xl p-5 gap-4" style={{ backgroundColor: c.card }}>
            <Text className="font-black text-[15px] text-center" style={{ color: c.accent }}>✏️ Editar tiempos</Text>

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
                <View key={ev.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
    </SafeAreaView>
  );
}
