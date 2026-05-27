import { useState, useRef, useMemo } from "react";
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
  ScrollView,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { timeOptions } from "@/src/utils/timeFormat";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby, calcAge, STATUS_LABELS } from "@/src/hooks/useBaby";
import { useActiveProfile, useProfiles } from "@/src/hooks/useProfile";
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
import { useWakeWindows, getWakeReference } from "@/src/hooks/useWakeWindows";
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
import { useQuickActionPresets, useQuickSavePreset } from "@/src/hooks/useEventPresets";
import type { EventPreset } from "@/src/hooks/useEventPresets";
import { QuickPresetSheet } from "@/src/components/ui/QuickPresetSheet";

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

function WakeWindowBar({
  awakeMs,
  ref: wakeRef,
  onPress,
}: {
  awakeMs: number;
  ref: { minMin: number; maxMin: number };
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const totalMin = Math.round(awakeMs / 60000);
  const label = totalMin < 60 ? `${totalMin}m` : `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  const pct = Math.min((awakeMs / 60000) / wakeRef.maxMin * 100, 200);
  const isOvertired = pct > 100;

  const wokeUpAt = Date.now() - awakeMs;
  const earliestNap = new Date(wokeUpAt + wakeRef.minMin * 60000);
  const latestNap = new Date(wokeUpAt + wakeRef.maxMin * 60000);
  const napTimeStr = `${earliestNap.toLocaleTimeString("es-MX", timeOptions())} — ${latestNap.toLocaleTimeString("es-MX", timeOptions())}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: isOvertired ? "rgba(171,71,188,0.2)" : "rgba(255,255,255,0.1)",
        marginHorizontal: 12, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
        marginTop: 4, marginBottom: 2, minHeight: 40, gap: 8,
      }}
    >
      <Text style={{ fontSize: 16 }}>{isOvertired ? "🫶" : "⏳"}</Text>
      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700", flex: 1 }}>
        {label} despierto
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" }}>
        {isOvertired ? "ya quiere dormir" : `siesta ≈ ${napTimeStr}`}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>›</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
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
  const { data: allProfiles } = useProfiles();
  const profileMap = useMemo(() => {
    const m = new Map(allProfiles?.map((p) => [p.id, p]) ?? []);
    return m;
  }, [allProfiles]);
  const { data: activeSession } = useActiveFeedingSession(baby?.id);
  const { data: activeSleep } = useActiveSleepSession(baby?.id);
  const { data: tlEvents } = useTimeline(baby?.id, 60);
  const { data: sessions } = useFeedingHistory(baby?.id, 30);
  const { data: sleepHistory } = useSleepHistory(baby?.id, 20);
  const { data: eventTypes } = useEventTypes();
  const HOME_FILTERS = [
    { key: "all", emoji: "📋" },
    { key: "feeding", emoji: "🤱" },
    { key: "sleep", emoji: "😴" },
    { key: "diaper", emoji: "🍑" },
    { key: "measurement", emoji: "📏" },
    { key: "food", emoji: "🍎" },
    { key: "other", emoji: "📝" },
  ];
  const DATE_FILTERS = [
    { key: "all", label: "Todo" },
    { key: "today", label: "Hoy" },
    { key: "7d", label: "7d" },
    { key: "10d", label: "10d" },
    { key: "range", label: "📅 Rango" },
  ];
  const [showFilters, setShowFilters] = useState(false);
  const [homeFilter, setHomeFilter] = useState("all");
  const [homeDateFilter, setHomeDateFilter] = useState("all");
  const [homeSearchText, setHomeSearchText] = useState("");
  const [homeRangeStart, setHomeRangeStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d;
  });
  const [homeRangeEnd, setHomeRangeEnd] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });
  const [showHomeDatePicker, setShowHomeDatePicker] = useState<"start" | "end" | null>(null);
  const startFeeding = useStartFeeding();
  const startSleep = useStartSleep();
  const finishSleep = useFinishSleep();
  const saveEvent = useSaveTimelineEvent();
  const { data: quickPresets } = useQuickActionPresets();
  const quickSavePreset = useQuickSavePreset();
  const [showQuickPreset, setShowQuickPreset] = useState(false);
  const [activePreset, setActivePreset] = useState<EventPreset | null>(null);

  const c = theme.colors;

  const babyAvatar = (baby as any)?.avatarEmoji ?? "👶";
  const babyPhotoUri = baby?.photoUri ?? null;

  const wakeWindows = useWakeWindows(
    sleepHistory?.filter((s) => s.status === "finished") ?? [],
    baby ? new Date(baby.birthDate) : null,
  );
  const wakeMap = useMemo(() => {
    const m = new Map<string, { durationMs: number; windowIndex: number; expectedMin: number; expectedMax: number }>();
    for (const ww of wakeWindows) {
      m.set(ww.nextSleepId, {
        durationMs: ww.durationMs,
        windowIndex: ww.windowIndex,
        expectedMin: getWakeReference(baby ? Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000) : 0).minMin,
        expectedMax: getWakeReference(baby ? Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000) : 0).maxMin,
      });
    }
    return m;
  }, [wakeWindows, baby]);

  const currentWake = useMemo(() => {
    if (!sleepHistory || activeSleep) return null;
    const finished = sleepHistory
      .filter((s) => s.status === "finished" && s.endedAt)
      .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime());
    const last = finished[0];
    if (!last) return null;
    const awakeMs = Date.now() - new Date(last.endedAt!).getTime();
    const ageDays = baby ? Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000) : 0;
    const ref = getWakeReference(ageDays);
    const pct = Math.min((awakeMs / 60000) / ref.maxMin * 100, 200);
    return { awakeMs, ref, pct, lastSleepEnd: last.endedAt };
  }, [sleepHistory, activeSleep, baby]);

  type TLItem =
    | { kind: "event"; data: NonNullable<typeof tlEvents>[0]; ts: number }
    | { kind: "session"; data: NonNullable<typeof sessions>[0]; ts: number }
    | { kind: "sleep"; data: NonNullable<typeof sleepHistory>[0]; ts: number }
    | { kind: "date"; date: Date; ts: number };

  const dateCutoff = useMemo(() => {
    if (homeDateFilter === "all") return null;
    if (homeDateFilter === "range") return homeRangeStart;
    const n = new Date();
    if (homeDateFilter === "today") { n.setHours(0, 0, 0, 0); return n; }
    const days = homeDateFilter === "7d" ? 7 : 10;
    n.setDate(n.getDate() - days + 1);
    n.setHours(0, 0, 0, 0);
    return n;
  }, [homeDateFilter, homeRangeStart]);

  const matchesText = (text: string | null | undefined) => {
    if (!homeSearchText.trim()) return true;
    return (text ?? "").toLowerCase().includes(homeSearchText.trim().toLowerCase());
  };

  const buildItems = (): TLItem[] => {
    const inRange = (ts: Date | number) => {
    const d = new Date(ts);
    if (homeDateFilter === "range") {
      return d >= homeRangeStart && d <= homeRangeEnd;
    }
    return !dateCutoff || d >= dateCutoff;
  };

    const filteredEvents = (tlEvents ?? []).filter((e) => {
      if (!inRange(e.timestamp)) return false;
      if (!matchesText(e.notes)) return false;
      if (homeFilter === "all") return true;
      if (homeFilter === "diaper") return e.eventTypeId === "diaper";
      if (homeFilter === "other") {
        const cat = eventTypes?.find((t) => t.id === e.eventTypeId)?.category;
        return cat === "other" || cat === "health";
      }
      return false;
    });
    const filteredSessions = (homeFilter === "all" || homeFilter === "feeding")
      ? (sessions ?? []).filter((s) => s.status === "finished" && inRange(s.startedAt) && matchesText(s.notes)) : [];
    const filteredSleep = (homeFilter === "all" || homeFilter === "sleep")
      ? (sleepHistory ?? []).filter((s) => s.status === "finished" && inRange(s.startedAt) && matchesText(s.notes)) : [];
    const all: TLItem[] = [
      ...filteredEvents.map((e) => ({
        kind: "event" as const,
        data: e,
        ts: new Date(e.timestamp).getTime(),
      })),
      ...filteredSessions.map((s) => ({
        kind: "session" as const,
        data: s,
        ts: s.endedAt
          ? new Date(s.endedAt).getTime()
          : new Date(s.startedAt).getTime(),
      })),
      ...filteredSleep.map((s) => ({
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

  const handlePresetTap = (preset: EventPreset) => {
    setActivePreset(preset);
    setShowQuickPreset(true);
  };

  const handleQuickSave = async (timestamp: Date, notes: string) => {
    if (!baby || !activePreset) return;
    await quickSavePreset.mutateAsync({
      babyId: baby.id,
      preset: activePreset,
      timestamp,
      notes,
    });
    setShowQuickPreset(false);
    setActivePreset(null);
  };

  const renderItem = ({ item, index }: { item: TLItem; index: number }) => {
    function getProfileId(t: TLItem): string | null {
      if (t.kind === "date") return null;
      return t.data.profileId;
    }
    const prevItem = index > 0 ? items[index - 1] : null;
    const itemProfileId = getProfileId(item);
    const isFirstInGroup = !prevItem || prevItem.kind === "date" || getProfileId(prevItem) !== itemProfileId;
    const itemProfile = itemProfileId ? profileMap.get(itemProfileId) : undefined;

    if (item.kind === "date") return <DateSeparator date={item.date} />;
    if (item.kind === "session") {
      const isOwn = item.data.profileId === profile?.id;
      return (
        <FeedingSessionBubble
          session={item.data}
          isOwn={isOwn}
          isFirstInGroup={isFirstInGroup}
          profile={isOwn ? undefined : itemProfile}
          onPress={() => router.push(`/logs/feeding/${item.data.id}`)}
        />
      );
    }
    if (item.kind === "sleep") {
      const isOwn = item.data.profileId === profile?.id;
      const prevWW = wakeMap.get(item.data.id);
      return (
        <SleepSessionBubble
          session={item.data}
          isOwn={isOwn}
          isFirstInGroup={isFirstInGroup}
          profile={isOwn ? undefined : itemProfile}
          onPress={() => router.push(`/logs/sleep/${item.data.id}`)}
          prevWakeWindow={prevWW ?? null}
        />
      );
    }
    const isOwn = item.data.profileId === profile?.id;
    const evType = eventTypes?.find((t) => t.id === item.data.eventTypeId);

    return (
      <TimelineBubble
        event={item.data}
        eventType={evType}
        isOwn={isOwn}
        isFirstInGroup={isFirstInGroup}
        profile={isOwn ? undefined : itemProfile}
        onPress={() => item.data.eventTypeId === "diaper"
          ? router.push(`/logs/diaper/${item.data.id}`)
          : router.push(`/logs/event/${item.data.id}`)
        }
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
          <TouchableOpacity
            onPress={() => setShowFilters((s) => !s)}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 20, color: "rgba(255,255,255,0.8)" }}>
              {showFilters ? "✕" : "🔍"}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={{ backgroundColor: c.headerBg, paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {HOME_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setHomeFilter(f.key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
                  backgroundColor: homeFilter === f.key ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)",
                  minHeight: 32,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: homeFilter === f.key ? c.headerBg : "#fff" }}>
                  {f.emoji}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {DATE_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setHomeDateFilter(f.key)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 5, borderRadius: 99,
                  backgroundColor: homeDateFilter === f.key ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)",
                  minHeight: 30,
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: "700",
                  color: homeDateFilter === f.key ? c.headerBg : "rgba(255,255,255,0.9)",
                }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {homeDateFilter === "range" && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowHomeDatePicker("start")}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                  minHeight: 38,
                }}
              >
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Desde</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff", flex: 1 }}>
                  {homeRangeStart.toLocaleDateString("es-MX")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowHomeDatePicker("end")}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                  minHeight: 38,
                }}
              >
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Hasta</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff", flex: 1 }}>
                  {homeRangeEnd.toLocaleDateString("es-MX")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{
            flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 99, paddingHorizontal: 14, minHeight: 36,
          }}>
            <TextInput
              value={homeSearchText}
              onChangeText={setHomeSearchText}
              placeholder="Buscar…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={{ flex: 1, fontSize: 14, color: "#fff", paddingVertical: 6 }}
            />
            {homeSearchText.length > 0 && (
              <TouchableOpacity onPress={() => setHomeSearchText("")} style={{ minHeight: 36, justifyContent: "center", paddingLeft: 8 }}>
                <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {showHomeDatePicker && (
        <DateTimePicker
          value={showHomeDatePicker === "start" ? homeRangeStart : homeRangeEnd}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_event: DateTimePickerEvent, date?: Date) => {
            if (date) {
              if (showHomeDatePicker === "start") {
                const d = new Date(date); d.setHours(0, 0, 0, 0); setHomeRangeStart(d);
              } else {
                const d = new Date(date); d.setHours(23, 59, 59, 999); setHomeRangeEnd(d);
              }
            }
            if (Platform.OS === "android") setShowHomeDatePicker(null);
          }}
        />
      )}
      {Platform.OS === "ios" && showHomeDatePicker && (
        <TouchableOpacity
          onPress={() => setShowHomeDatePicker(null)}
          style={{ backgroundColor: c.headerBg, alignItems: "center", paddingVertical: 8, minHeight: 44 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Listo</Text>
        </TouchableOpacity>
      )}

      {currentWake && !activeSleep && !activeSession && (
        <WakeWindowBar
          awakeMs={currentWake.awakeMs}
          ref={currentWake.ref}
          onPress={() => router.push("/wake-windows")}
        />
      )}

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
                emoji="📏"
                label="Medir"
                bgColor={c.growth}
                onPress={() => router.push("/logs/growth/new")}
                disabled={!!loadingType}
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
                emoji="🍎"
                label="Comida"
                bgColor="#7CB342"
                onPress={() => router.push("/logs/food/new")}
                disabled={!!loadingType}
              />
              <QuickBtn
                emoji="🌡️"
                label="Salud"
                bgColor="#F97316"
                onPress={() => router.push("/logs/health/new")}
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

            {(quickPresets?.length ?? 0) > 0 && (
              <View style={{ marginBottom: 8, paddingHorizontal: 2 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {quickPresets?.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => handlePresetTap(p)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        paddingVertical: 8, paddingHorizontal: 14,
                        borderRadius: 99,
                        backgroundColor: c.elevated,
                        minHeight: 36,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{p.emoji}</Text>
                      <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "700" }}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8, paddingHorizontal: 2 }}>
              <TouchableOpacity
                onPress={() => router.push("/logs/feeding/retro")}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: c.elevated, minHeight: 36 }}
              >
                <Text style={{ fontSize: 14 }}>⏱</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "700" }}>Rezagada</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/resources")}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: c.elevated, minHeight: 36 }}
              >
                <Text style={{ fontSize: 14 }}>📖</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "700" }}>Recursos</Text>
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
      <QuickPresetSheet
        preset={activePreset}
        visible={showQuickPreset}
        onClose={() => { setShowQuickPreset(false); setActivePreset(null); }}
        onSave={handleQuickSave}
        saving={quickSavePreset.isPending}
      />
    </SafeAreaView>
  );
}
