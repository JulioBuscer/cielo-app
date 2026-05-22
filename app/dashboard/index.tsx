import { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby, calcAge, STATUS_LABELS } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import {
  useActiveFeedingSession,
  useFeedingHistory,
  useStartFeeding,
  type FeedingType,
  type BottleSubtype,
} from "@/src/hooks/useFeedingSessions";
import {
  useActiveSleepSession,
  useStartSleep,
  useFinishSleep,
  useSleepHistory,
} from "@/src/hooks/useSleepSessions";
import {
  useTimeline,
  useSaveTimelineEvent,
  useEventTypes,
} from "@/src/hooks/useTimeline";
import { ActiveFeedingCard } from "@/src/components/ui/ActiveFeedingCard";
import { ActiveSleepCard } from "@/src/components/ui/ActiveSleepCard";
import { BottleSubtypeModal } from "@/src/components/ui/BottleSubtypeModal";
import {
  TimelineBubble,
  FeedingSessionBubble,
  SleepSessionBubble,
  DateSeparator,
} from "@/src/components/ui/TimelineBubbles";
import { InlineEventTypeModal } from "@/src/components/ui/CatalogModals";
import { useTheme } from "@/src/theme/useTheme";

function QuickBtn({
  emoji,
  label,
  onPress,
  disabled,
  loading,
  bgColor,
  size = 52,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  bgColor: string;
  size?: number;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{ alignItems: "center", gap: 3, opacity: disabled ? 0.4 : 1 }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: bgColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={{ fontSize: size >= 60 ? 26 : 20 }}>{emoji}</Text>
        )}
      </View>
      <Text style={{ fontSize: 9, fontWeight: "900", color: theme.colors.textMuted, textAlign: "center", lineHeight: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function EventPickerModal({
  visible,
  onClose,
  onSelect,
  onNewEvent,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewEvent: () => void;
}) {
  const { theme } = useTheme();
  const { data: types } = useEventTypes();
  const available = (types ?? []).filter((t) => t.id !== "diaper");
  const c = theme.colors;
  if (!visible) return null;
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        justifyContent: "flex-end",
        zIndex: 100,
      }}
    >
      <View style={{ backgroundColor: c.textBody + "66", flex: 1 }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </View>
      <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 }}>
        <View style={{ width: 40, height: 4, backgroundColor: c.accent + "4D", borderRadius: 99, alignSelf: "center", marginBottom: 16 }} />
        <Text style={{ fontWeight: "900", fontSize: 17, color: c.textBody, marginBottom: 12 }}>
          📝 Registrar Evento
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {available.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => onSelect(t.id)}
              style={{ backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48 }}
            >
              <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
              <Text style={{ fontWeight: "900", fontSize: 14, color: c.textBody }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={onNewEvent}
            style={{ backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, borderWidth: 1, borderColor: "transparent", borderStyle: "dashed" }}
          >
            <Text style={{ fontSize: 20 }}>➕</Text>
            <Text style={{ fontWeight: "900", fontSize: 13, color: c.textMuted }}>Nuevo</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={{ marginTop: 14, alignItems: "center", paddingVertical: 14, minHeight: 48 }}
        >
          <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 15 }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const { theme } = useTheme();
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showNewEventTypeModal, setShowNewEventTypeModal] = useState(false);
  const [loadingType, setLoadingType] = useState<FeedingType | null>(null);
  const [sleepLoading, setSleepLoading] = useState(false);
  const [note, setNote] = useState("");
  const flatRef = useRef<FlatList>(null);

  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: activeSession } = useActiveFeedingSession(baby?.id);
  const { data: activeSleep } = useActiveSleepSession(baby?.id);
  const { data: tlEvents } = useTimeline(baby?.id, 60);
  const { data: sessions } = useFeedingHistory(baby?.id, 30);
  const { data: sleepHistory } = useSleepHistory(baby?.id, 20);
  const { data: eventTypes } = useEventTypes();
  const startFeeding = useStartFeeding();
  const startSleep = useStartSleep();
  const finishSleep = useFinishSleep();
  const saveEvent = useSaveTimelineEvent();

  const c = theme.colors;

  const babyAvatar = (baby as any)?.avatarEmoji ?? "👶";
  const babyPhotoUri = baby?.photoUri ?? null;

  type TLItem =
    | { kind: "event"; data: NonNullable<typeof tlEvents>[0]; ts: number }
    | { kind: "session"; data: NonNullable<typeof sessions>[0]; ts: number }
    | { kind: "sleep"; data: NonNullable<typeof sleepHistory>[0]; ts: number }
    | { kind: "date"; date: Date; ts: number };

  const buildItems = (): TLItem[] => {
    const all: TLItem[] = [
      ...(tlEvents ?? []).map((e) => ({
        kind: "event" as const,
        data: e,
        ts: new Date(e.timestamp).getTime(),
      })),
      ...(sessions ?? [])
        .filter((s) => s.status === "finished")
        .map((s) => ({
          kind: "session" as const,
          data: s,
          ts: s.endedAt
            ? new Date(s.endedAt).getTime()
            : new Date(s.startedAt).getTime(),
        })),
      ...(sleepHistory ?? [])
        .filter((s) => s.status === "finished")
        .map((s) => ({
          kind: "sleep" as const,
          data: s,
          ts: s.endedAt
            ? new Date(s.endedAt).getTime()
            : new Date(s.startedAt).getTime(),
        })),
    ].sort((a, b) => a.ts - b.ts);

    const result: TLItem[] = [];
    let lastDate = "";
    for (const item of all) {
      const dateStr = new Date(item.ts).toDateString();
      if (dateStr !== lastDate) {
        result.push({ kind: "date", date: new Date(item.ts), ts: item.ts - 1 });
        lastDate = dateStr;
      }
      result.push(item);
    }
    return result;
  };

  const items = buildItems();

  const handleStartFeeding = async (
    type: FeedingType,
    bottleSubtype?: BottleSubtype,
  ) => {
    if (!baby) return;
    setLoadingType(type);
    try {
      await startFeeding.mutateAsync({ babyId: baby.id, type, bottleSubtype });
    } finally {
      setLoadingType(null);
    }
  };

  const handleToggleSleep = async () => {
    if (!baby) return;
    setSleepLoading(true);
    try {
      if (activeSleep) {
        await finishSleep.mutateAsync(activeSleep);
      } else {
        await startSleep.mutateAsync({ babyId: baby.id });
      }
    } finally {
      setSleepLoading(false);
    }
  };

  const handleSendNote = () => {
    if (!note.trim() || !baby) return;
    saveEvent.mutate({
      babyId: baby.id,
      eventTypeId: "note",
      notes: note.trim(),
      feedingSessionId: activeSession?.id,
    });
    setNote("");
  };

  const handleEventSelect = (typeId: string) => {
    setShowEventPicker(false);
    if (typeId === "diaper") router.push("/logs/diaper/new");
    else
      router.push({
        pathname: "/logs/event/new",
        params: { preselect: typeId },
      });
  };

  const renderItem = ({ item }: { item: TLItem }) => {
    if (item.kind === "date") return <DateSeparator date={item.date} />;
    if (item.kind === "session") {
      const isOwn = item.data.profileId === profile?.id;
      return (
        <FeedingSessionBubble
          session={item.data}
          isOwn={isOwn}
          profileName={!isOwn ? "Otro cuidador" : undefined}
          onPress={() => router.push(`/logs/feeding/${item.data.id}`)}
        />
      );
    }
    if (item.kind === "sleep") {
      const isOwn = item.data.profileId === profile?.id;
      return (
        <SleepSessionBubble
          session={item.data}
          isOwn={isOwn}
          profileName={!isOwn ? "Otro cuidador" : undefined}
          onPress={() => router.push(`/logs/sleep/${item.data.id}`)}
        />
      );
    }
    const isOwn = item.data.profileId === profile?.id;
    const evType = eventTypes?.find((t) => t.id === item.data.eventTypeId);
    const emoji = evType?.emoji ?? "📝";
    const label = evType?.label ?? item.data.eventTypeId;

    return (
      <TimelineBubble
        event={item.data}
        eventTypeEmoji={emoji}
        eventTypeLabel={label}
        isOwn={isOwn}
        profileName={!isOwn ? "Otro cuidador" : undefined}
        onPress={() => router.push(`/logs/event/${item.data.id}`)}
      />
    );
  };

  const sleepStatus = activeSleep
    ? activeSleep.status === "active"
      ? "😴 Durmiendo"
      : "😴 Sueño pausado"
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      <View
        style={{
          backgroundColor: c.headerBg,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minHeight: 44 }}
          onPress={() => router.push("/baby/profile")}
        >
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {babyPhotoUri ? (
              <Image
                source={{ uri: babyPhotoUri }}
                style={{ width: 42, height: 42 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ fontSize: 22 }}>{babyAvatar}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 17 }}>
              {baby ? baby.nickname || baby.name : "Cielo"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" }}>
              {baby
                ? [
                  activeSession ? "🍼 Comiendo" : null,
                  sleepStatus,
                  !activeSession && !sleepStatus
                    ? `${calcAge(baby.birthDate).label} · ${STATUS_LABELS[(baby.status ?? "unknown") as keyof typeof STATUS_LABELS]?.emoji ?? ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("  ·  ")
                : "Cielo App"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 99, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900" }}>⋮</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1, backgroundColor: c.surface }}>
          {(activeSession || activeSleep) && (
            <View style={{ paddingHorizontal: 12, paddingTop: 8, gap: 0 }}>
              {activeSession && <ActiveFeedingCard session={activeSession} />}
              {activeSleep && <ActiveSleepCard session={activeSleep} />}
            </View>
          )}

          <FlatList
            ref={flatRef}
            data={[...items].reverse()}
            keyExtractor={(item, i) => `${item.kind}-${item.ts}-${i}`}
            renderItem={renderItem}
            inverted
            contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🌙</Text>
                <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 15, textAlign: "center" }}>
                  Aquí aparecerá el historial{"\n"}
                  {baby?.nickname || baby?.name || ""}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 8, textAlign: "center" }}>
                  Empieza registrando la primera toma
                </Text>
              </View>
            }
          />

          <View style={{ backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.elevated, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                paddingHorizontal: 2,
                marginBottom: 10,
              }}
            >
              <QuickBtn
                emoji="🤱"
                label={"Pecho\nIzq."}
                bgColor={c.accent}
                onPress={() => handleStartFeeding("breast_left")}
                loading={loadingType === "breast_left"}
                disabled={!!loadingType}
              />
              <QuickBtn
                emoji="🤱"
                label={"Pecho\nDer."}
                bgColor={c.accent}
                onPress={() => handleStartFeeding("breast_right")}
                loading={loadingType === "breast_right"}
                disabled={!!loadingType}
              />

              <QuickBtn
                emoji={activeSleep ? "☀️" : "😴"}
                label={activeSleep ? "Despertar" : "Dormir"}
                bgColor={activeSleep ? "#6366F1" : "#818CF8"}
                size={58}
                onPress={handleToggleSleep}
                loading={sleepLoading}
                disabled={sleepLoading}
              />

              <QuickBtn
                emoji="🍼"
                label="Biberón"
                bgColor={c.feeding.bottle}
                onPress={() => setShowBottleModal(true)}
                loading={loadingType === "bottle"}
                disabled={!!loadingType}
              />
              <QuickBtn
                emoji="🍑"
                label="Pañal"
                bgColor={c.warning}
                onPress={() => router.push("/logs/diaper/new")}
                disabled={!!loadingType}
              />
              <QuickBtn
                emoji="➕"
                label="Evento"
                bgColor={c.accentStrong}
                onPress={() => setShowEventPicker(true)}
                disabled={!!loadingType}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8, paddingHorizontal: 2 }}>
              <TouchableOpacity
                onPress={() => router.push("/stats")}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: c.elevated, minHeight: 36 }}
              >
                <Text style={{ fontSize: 14 }}>📊</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "700" }}>Stats</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/logs/feeding/retro")}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: c.elevated, minHeight: 36 }}
              >
                <Text style={{ fontSize: 14 }}>⏱</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "700" }}>Rezagada</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: c.elevated,
                  borderRadius: 99,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: c.textBody,
                }}
                placeholder="Nota rápida…"
                placeholderTextColor={c.textMuted}
                value={note}
                onChangeText={setNote}
                onSubmitEditing={handleSendNote}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={handleSendNote}
                disabled={!note.trim()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.whatsGreen,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: c.whatsGreen,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.35,
                  shadowRadius: 6,
                  elevation: 4,
                  opacity: note.trim() ? 1 : 0.4,
                }}
              >
                <Text style={{ color: "white", fontSize: 18 }}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottleSubtypeModal
        visible={showBottleModal}
        onClose={() => setShowBottleModal(false)}
        onSelect={(subtype) => {
          setShowBottleModal(false);
          handleStartFeeding("bottle", subtype);
        }}
      />
      <EventPickerModal
        visible={showEventPicker}
        onClose={() => setShowEventPicker(false)}
        onSelect={handleEventSelect}
        onNewEvent={() => {
          setShowEventPicker(false);
          setShowNewEventTypeModal(true);
        }}
      />
      <InlineEventTypeModal
        visible={showNewEventTypeModal}
        onClose={() => setShowNewEventTypeModal(false)}
        onSelect={(id: string) => {
          handleEventSelect(id);
        }}
      />
    </SafeAreaView>
  );
}
