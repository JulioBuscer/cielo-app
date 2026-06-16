import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Clipboard from 'expo-clipboard';
import { timeOptions } from "@/src/utils/timeFormat";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby, useSetActiveBaby, useBaby, calcAge, STATUS_LABELS } from "@/src/hooks/useBaby";
import { useActiveProfile, useProfiles } from "@/src/hooks/useProfile";
import {
  useActiveFeedingSession,
  useFeedingHistory,
  useStartFeeding,
  useDeleteFeedingSession,
  type FeedingType,
  type BottleSubtype,
} from "@/src/hooks/useFeedingSessions";
import {
  useActiveSleepSession,
  useStartSleep,
  useFinishSleep,
  useDeleteSleepSession,
  useSleepHistory,
} from "@/src/hooks/useSleepSessions";
import {
  useTimeline,
  useSaveTimelineEvent,
  useEventTypes,
  useDeleteTimelineEvent,
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
import { ItemEditorModal } from "@/src/components/ui/ItemEditorModal";
import { useTheme } from "@/src/theme/useTheme";
import { useQuickActionItems, useQuickSaveCatalogItem, useCatalogItems } from "@/src/hooks/useCatalogItems";
import type { CatalogItem } from "@/src/hooks/useCatalogItems";
import { DiaperSheet } from "@/src/components/diaper/DiaperSheet";
import { TemperatureSheet } from "@/src/components/health/TemperatureSheet";
import { FoodSheet } from "@/src/components/food/FoodSheet";
import { getCategory, getCategoryLabel } from "@/src/utils/categories";
import { TodaySummary } from "@/src/components/chat/TodaySummary";
import { QuickActionFAB, type ActionId } from "@/src/components/chat/QuickActionFAB";
import { StatsSection } from "@/src/components/analisis/StatsSection";
import { HistorySection } from "@/src/components/analisis/HistorySection";
import {
  shareSingleRecord,
  eventToShareData,
  feedingToShareData,
  sleepToShareData,
} from "@/src/utils/shareReport";

function QuickBtn({
  emoji,
  label,
  onPress,
  onLongPress,
  disabled,
  loading,
  bgColor,
  size = 52,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  bgColor: string;
  size?: number;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      disabled={disabled || loading}
      style={{ alignItems: "center", gap: 3, opacity: disabled || loading ? 0.4 : 1 }}
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
  const c = theme.colors;

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof types>();
    for (const t of types ?? []) {
      if (t.id === "diaper") continue;
      const cat = t.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return map;
  }, [types]);

  const categoryOrder = ["health", "feeding", "growth", "other"];

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
        <ScrollView style={{ maxHeight: 400 }}>
          {categoryOrder.map((catId) => {
            const items = byCategory.get(catId);
            if (!items?.length) return null;
            const cat = getCategory(catId);
            return (
              <View key={catId} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: cat.color, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                  {cat.emoji} {cat.label}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {items.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => onSelect(t.id)}
                      style={{ backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48 }}
                    >
                      <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                      <Text style={{ fontWeight: "900", fontSize: 14, color: c.textBody }}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
          <TouchableOpacity
            onPress={onNewEvent}
            style={{ backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, borderWidth: 1, borderColor: c.textDim + "40", borderStyle: "dashed" }}
          >
            <Text style={{ fontSize: 20 }}>➕</Text>
            <Text style={{ fontWeight: "900", fontSize: 13, color: c.textMuted }}>Nuevo tipo de evento</Text>
          </TouchableOpacity>
        </ScrollView>
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
        backgroundColor: isOvertired ? "rgba(171,71,188,0.2)" : c.elevated + "99",
        marginHorizontal: 12, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
        marginTop: 4, marginBottom: 2, minHeight: 40, gap: 8,
      }}
    >
      <Text style={{ fontSize: 16 }}>{isOvertired ? "🫶" : "⏳"}</Text>
      <Text style={{ color: c.textBody, fontSize: 13, fontWeight: "700", flex: 1 }}>
        {label} despierto
      </Text>
      <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>
        {isOvertired ? "ya quiere dormir" : `siesta ≈ ${napTimeStr}`}
      </Text>
      <Text style={{ color: c.textDim, fontSize: 14 }}>›</Text>
    </TouchableOpacity>
  );
}

export default function ChatTimelineScreen() {
  const { babyId } = useLocalSearchParams<{ babyId: string }>();
  const { theme } = useTheme();
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showNewEventTypeModal, setShowNewEventTypeModal] = useState(false);
  const [loadingType, setLoadingType] = useState<FeedingType | null>(null);
  const [sleepLoading, setSleepLoading] = useState(false);
  const [note, setNote] = useState("");
  const [showDiaperSheet, setShowDiaperSheet] = useState(false);
  const [showTemperatureSheet, setShowTemperatureSheet] = useState(false);
  const [showFoodSheet, setShowFoodSheet] = useState(false);
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
  const flatRef = useRef<FlatList>(null);
  const setActiveBaby = useSetActiveBaby();

  const { data: baby } = useBaby(babyId);
  const { data: profile } = useActiveProfile();
  const { data: allProfiles } = useProfiles();
  const profileMap = useMemo(() => {
    const m = new Map(allProfiles?.map((p) => [p.id, p]) ?? []);
    return m;
  }, [allProfiles]);
  const { data: activeSession } = useActiveFeedingSession(babyId);
  const { data: activeSleep } = useActiveSleepSession(babyId);
  const { data: tlEvents } = useTimeline(babyId, 60);
  const { data: sessions } = useFeedingHistory(babyId, 30);
  const { data: sleepHistory } = useSleepHistory(babyId, 20);
  const { data: eventTypes } = useEventTypes();
  const { data: allCatalogItems } = useCatalogItems();
  const catalogItemMap = useMemo(() => {
    if (!allCatalogItems) return {};
    const map: Record<string, CatalogItem> = {};
    for (const item of allCatalogItems) map[item.id] = item;
    return map;
  }, [allCatalogItems]);

  const startFeeding = useStartFeeding();
  const deleteFeeding = useDeleteFeedingSession();
  const startSleep = useStartSleep();
  const finishSleep = useFinishSleep();
  const deleteSleep = useDeleteSleepSession();
  const saveEvent = useSaveTimelineEvent();
  const deleteEvent = useDeleteTimelineEvent();
  const { data: quickItems } = useQuickActionItems();
  const quickSaveItem = useQuickSaveCatalogItem();

  const c = theme.colors;
  const babyAvatar = (baby as any)?.avatarEmoji ?? "👶";
  const babyPhotoUri = baby?.photoUri ?? null;

  // Set active baby if different
  const { data: activeBaby } = useActiveBaby();
  useEffect(() => {
    if (babyId && activeBaby && activeBaby.id !== babyId) {
      setActiveBaby.mutate(babyId);
    }
  }, [babyId, activeBaby?.id]);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<"stats" | "historial">("stats");
  const [showBabyMenu, setShowBabyMenu] = useState(false);

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

  const HOME_FILTERS = [
    { key: "all", emoji: "📋" },
    { key: "feeding", emoji: "🤱" },
    { key: "sleep", emoji: "😴" },
    { key: "diaper", emoji: "🍑" },
    { key: "health", emoji: "💊" },
    { key: "growth", emoji: "📏" },
    { key: "measurement", emoji: "📐" },
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
      if (homeFilter === "health" || homeFilter === "growth") {
        const cat = eventTypes?.find((t) => t.id === e.eventTypeId)?.category;
        return cat === homeFilter;
      }
      if (homeFilter === "other") {
        const cat = eventTypes?.find((t) => t.id === e.eventTypeId)?.category;
        return cat === "other";
      }
      return false;
    });
    const filteredSessions = (homeFilter === "all" || homeFilter === "feeding")
      ? (sessions ?? []).filter((s) => s.status === "finished" && inRange(s.startedAt) && matchesText(s.notes)) : [];
    const filteredSleep = (homeFilter === "all" || homeFilter === "sleep")
      ? (sleepHistory ?? []).filter((s) => s.status === "finished" && inRange(s.startedAt) && matchesText(s.notes)) : [];
    const all: TLItem[] = [
      ...filteredEvents.map((e) => ({ kind: "event" as const, data: e, ts: new Date(e.timestamp).getTime() })),
      ...filteredSessions.map((s) => ({ kind: "session" as const, data: s, ts: s.endedAt ? new Date(s.endedAt).getTime() : new Date(s.startedAt).getTime() })),
      ...filteredSleep.map((s) => ({ kind: "sleep" as const, data: s, ts: s.endedAt ? new Date(s.endedAt).getTime() : new Date(s.startedAt).getTime() })),
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

  const handleStartFeeding = async (type: FeedingType, bottleSubtype?: BottleSubtype) => {
    if (!babyId) return;
    setLoadingType(type);
    try {
      await startFeeding.mutateAsync({ babyId, type, bottleSubtype });
    } finally {
      setLoadingType(null);
    }
  };

  const handleToggleSleep = async () => {
    if (!babyId) return;
    setSleepLoading(true);
    try {
      if (activeSleep) {
        await finishSleep.mutateAsync(activeSleep);
      } else {
        await startSleep.mutateAsync({ babyId });
      }
    } finally {
      setSleepLoading(false);
    }
  };

  const handleSendNote = () => {
    if (!note.trim() || !babyId) return;
    saveEvent.mutate({
      babyId,
      eventTypeId: "note",
      notes: note.trim(),
      feedingSessionId: activeSession?.id,
      timestamp: new Date(),
    });
    setNote("");
  };

  const handleEventSelect = (typeId: string) => {
    setShowEventPicker(false);
    if (typeId === "diaper") setShowDiaperSheet(true);
    else if (typeId === "temperature") setShowTemperatureSheet(true);
    else
      router.push({
        pathname: "/logs/event/new",
        params: { preselect: typeId },
      });
  };

  const handleFABAction = useCallback((action: { id: ActionId; bottleSubtype?: BottleSubtype }) => {
    if (!babyId) return;
    switch (action.id) {
      case "breast_left":
      case "breast_right":
        handleStartFeeding(action.id);
        break;
      case "bottle":
        setShowBottleModal(true);
        break;
      case "sleep":
        handleToggleSleep();
        break;
      case "diaper":
        setShowDiaperSheet(true);
        break;
      case "food":
        setShowFoodSheet(true);
        break;
      case "temperature":
        setShowTemperatureSheet(true);
        break;
      case "growth":
        router.push("/logs/growth/new");
        break;
      case "event":
        setShowEventPicker(true);
        break;
    }
  }, [babyId, activeSleep]);

  const savingTapRef = useRef(false);
  const handleItemTap = (item: CatalogItem) => {
    if (!babyId || savingTapRef.current) return;
    savingTapRef.current = true;
    quickSaveItem.mutate(
      { babyId, item, timestamp: new Date() },
      { onSettled: () => { savingTapRef.current = false; } },
    );
  };

  const handleItemLongPress = (item: CatalogItem) => {
    router.push({
      pathname: "/logs/event/new",
      params: {
        preselect: item.id,
        presetValues: item.defaultValues,
        presetUnitOverrides: item.defaultUnitOverrides,
        presetNotes: item.defaultNotes ?? "",
        presetName: item.name,
        presetEmoji: item.emoji,
        presetTags: item.defaultTags,
      },
    });
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

    const babyName = baby?.name ?? "Bebé";
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
          onShare={() => shareSingleRecord(feedingToShareData(item.data, babyName, profile?.name))}
          onLongPress={() => {
            Alert.alert("Eliminar sesión de toma", "¿Estás seguro?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Eliminar", style: "destructive", onPress: () => {
                deleteFeeding.mutate({ id: item.data.id, babyId }, {
                  onError: (e) => {
                    const msg = `[Eliminar toma] ${e?.message || e}`;
                    Alert.alert("Error", "No se pudo eliminar. Intenta de nuevo.", [
                      { text: "Copiar error", onPress: () => Clipboard.setStringAsync(msg) },
                      { text: "OK" },
                    ]);
                  },
                });
              }},
            ]);
          }}
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
          onShare={() => shareSingleRecord(sleepToShareData(item.data, babyName, profile?.name))}
          prevWakeWindow={prevWW ?? null}
          onLongPress={() => {
            Alert.alert("Eliminar sesión de sueño", "¿Estás seguro?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Eliminar", style: "destructive", onPress: () => {
                deleteSleep.mutate({ id: item.data.id, babyId }, {
                  onError: (e) => {
                    const msg = `[Eliminar sueño] ${e?.message || e}`;
                    Alert.alert("Error", "No se pudo eliminar. Intenta de nuevo.", [
                      { text: "Copiar error", onPress: () => Clipboard.setStringAsync(msg) },
                      { text: "OK" },
                    ]);
                  },
                });
              }},
            ]);
          }}
        />
      );
    }
    const isOwn = item.data.profileId === profile?.id;
    const evType = eventTypes?.find((t) => t.id === item.data.eventTypeId);
    const evCatalogItem = item.data.eventItemId ? catalogItemMap[item.data.eventItemId] : undefined;
    const evLabel = evType?.label ?? evType?.id ?? item.data.eventTypeId;

    return (
      <TimelineBubble
        event={item.data}
        eventType={evType}
        catalogItem={evCatalogItem}
        isOwn={isOwn}
        isFirstInGroup={isFirstInGroup}
        profile={isOwn ? undefined : itemProfile}
        onPress={() => item.data.eventTypeId === "diaper"
          ? router.push(`/logs/diaper/${item.data.id}`)
          : router.push(`/logs/event/${item.data.id}`)
        }
        onShare={() => shareSingleRecord(eventToShareData(item.data, babyName, profile?.name, evLabel))}
        onLongPress={() => {
          Alert.alert("Eliminar evento", "¿Estás seguro?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Eliminar", style: "destructive", onPress: () => {
              deleteEvent.mutate({ id: item.data.id, babyId }, {
                onError: (e) => {
                  const msg = `[Eliminar evento] ${e?.message || e}`;
                  Alert.alert("Error", "No se pudo eliminar. Intenta de nuevo.", [
                    { text: "Copiar error", onPress: () => Clipboard.setStringAsync(msg) },
                    { text: "OK" },
                  ]);
                },
              });
            }},
          ]);
        }}
      />
    );
  };

  if (!baby) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaView>
    );
  }

  const sleepStatus = activeSleep
    ? activeSleep.status === "active" ? "😴 Durmiendo" : "😴 Sueño pausado"
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      {/* Header */}
      <View style={{ backgroundColor: c.headerBg, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4, paddingVertical: 10 }}>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)")}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: "#FFFFFF" }}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minHeight: 44 }}
          onPress={() => setShowBabyMenu(true)}
        >
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {babyPhotoUri ? (
              <Image source={{ uri: babyPhotoUri }} style={{ width: 42, height: 42 }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 22 }}>{babyAvatar}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            {showAnalytics ? (
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 17 }}>
                📊 Análisis
              </Text>
            ) : (
              <>
                <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 17 }}>
                  {baby.nickname || baby.name}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" }}>
                  {[
                    activeSession ? "🍼 Comiendo" : null,
                    sleepStatus,
                    !activeSession && !sleepStatus ? `${calcAge(baby.birthDate).label} · ${STATUS_LABELS[(baby.status ?? "unknown") as keyof typeof STATUS_LABELS]?.emoji ?? ""}` : null,
                  ].filter(Boolean).join("  ·  ") || ""}
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity
            onPress={() => { setShowAnalytics((s) => !s); }}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 20, color: "rgba(255,255,255,0.8)" }}>
              {showAnalytics ? "✕" : "📊"}
            </Text>
          </TouchableOpacity>
          {!showAnalytics && (
            <TouchableOpacity
              onPress={() => setShowFilters((s) => !s)}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 20, color: "rgba(255,255,255,0.8)" }}>
                {showFilters ? "✕" : "🔍"}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters */}
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

      {showAnalytics ? (
        <View style={{ flex: 1, backgroundColor: c.surface, paddingHorizontal: 16, paddingTop: 8 }}>
          {/* Analytics tab bar */}
          <View style={{ flexDirection: "row", marginBottom: 8, backgroundColor: c.card, borderRadius: 12, padding: 3 }}>
            {[
              { key: "stats" as const, emoji: "📈", label: "Stats" },
              { key: "historial" as const, emoji: "📋", label: "Historial" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setAnalyticsTab(tab.key)}
                style={{
                  flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10,
                  backgroundColor: analyticsTab === tab.key ? c.accent : "transparent",
                  flexDirection: "row", justifyContent: "center", gap: 4,
                }}
              >
                <Text style={{ fontSize: 14 }}>{tab.emoji}</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: analyticsTab === tab.key ? "#fff" : c.textMuted }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {analyticsTab === "stats" ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
              <StatsSection babyId={babyId} />
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <HistorySection babyId={babyId} />
            </View>
          )}
        </View>
      ) : (
        <>
          {/* TodaySummary */}
          <TodaySummary babyId={babyId} />

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
              {/* Active session cards */}
              {(activeSession || activeSleep) && (
                <View style={{ paddingHorizontal: 12, paddingTop: 8, gap: 0 }}>
                  {activeSession && <ActiveFeedingCard session={activeSession} />}
                  {activeSleep && <ActiveSleepCard session={activeSleep} />}
                </View>
              )}

              {/* Timeline */}
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

              {!keyboardVisible && (
                <QuickActionFAB
                  onAction={handleFABAction}
                  activeSleep={!!activeSleep}
                  sleepLoading={sleepLoading}
                  disabled={!!loadingType}
                />
              )}

              {/* Note input bar */}
              <View style={{ backgroundColor: c.card, paddingHorizontal: 8, paddingVertical: 6, paddingBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: c.surface,
                      borderRadius: 22,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      fontSize: 15,
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
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: c.whatsGreen,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: note.trim() ? 1 : 0.4,
                      marginRight: 2,
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 18 }}>➤</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </>
      )}

      {/* Modals & Sheets */}
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
      <ItemEditorModal
        visible={showNewEventTypeModal}
        onClose={() => setShowNewEventTypeModal(false)}
        onSelect={(id: string) => { handleEventSelect(id); }}
      />
      <DiaperSheet visible={showDiaperSheet} onClose={() => setShowDiaperSheet(false)} />
      <TemperatureSheet visible={showTemperatureSheet} onClose={() => setShowTemperatureSheet(false)} />
      <FoodSheet visible={showFoodSheet} onClose={() => setShowFoodSheet(false)} />

      {/* Baby menu modal */}
      <Modal
        visible={showBabyMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBabyMenu(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setShowBabyMenu(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{
              backgroundColor: c.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: Platform.OS === "ios" ? 40 : 20,
              gap: 4,
            }}
          >
            <View style={{ width: 40, height: 4, backgroundColor: c.accent + "4D", borderRadius: 99, alignSelf: "center", marginBottom: 12 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.elevated, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 24 }}>{babyAvatar}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "900", color: c.textBody }}>{baby.nickname || baby.name}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>{calcAge(baby.birthDate).label}</Text>
              </View>
            </View>

            {[
              { emoji: "👤", label: "Editar perfil", route: "/baby/profile" },
              { emoji: "📈", label: "Curvas OMS", route: "/logs/growth/history" },
              { emoji: "📋", label: "Historial completo", route: "/history" },
              { emoji: "🍽️", label: "Historial de comidas", route: "/logs/food/history" },
              { emoji: "🌡️", label: "Salud", route: "/logs/health/new" },
              { emoji: "🥜", label: "Alérgenos", route: "/food/allergens" },
              { emoji: "⏳", label: "Ventanas de sueño", route: "/wake-windows" },
            ].map((item) => (
              <TouchableOpacity
                key={item.route}
                onPress={() => {
                  setShowBabyMenu(false);
                  router.push(item.route as any);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>{item.label}</Text>
                <View style={{ flex: 1 }} />
                <Text style={{ fontSize: 18, color: c.textMuted }}>‹</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
