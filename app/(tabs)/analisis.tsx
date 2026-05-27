
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  ViewStyle,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { timelineEvents, feedingSessions, sleepSessions, growthLogs, foodLogs } from "@/src/db/schema";
import { useActiveBaby, calcAge } from "@/src/hooks/useBaby";
import { useTimeline } from "@/src/hooks/useTimeline";
import { safeJsonParse } from "@/src/utils/safeJsonParse";
import { useTheme } from "@/src/theme/useTheme";
import { CalendarGrid } from "@/src/components/ui/CalendarGrid";
import { useCalendarData, type DayEvents } from "@/src/hooks/useCalendarData";
import { useEventTypes } from "@/src/hooks/useTimeline";
import { useFoodCatalog } from "@/src/hooks/useFoodLogs";
import { timeOptions } from "@/src/utils/timeFormat";

function StatCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.card,
        borderRadius: 16,
        padding: 14,
        gap: 4,
        borderWidth: 1,
        borderColor: c.elevated,
      }}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ fontSize: 20, fontWeight: "900", color: c.textBody }}>{value}</Text>
      <Text style={{ fontSize: 11, fontWeight: "700", color: c.textMuted }}>{label}</Text>
    </View>
  );
}

function QuickLink({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: c.card,
        borderRadius: 14,
        padding: 14,
        minHeight: 48,
        borderWidth: 1,
        borderColor: c.elevated,
      }}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 16, color: c.textMuted }}>›</Text>
    </TouchableOpacity>
  );
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function DaySheet({
  visible,
  onClose,
  dateStr,
  dayEvents,
  babyId,
}: {
  visible: boolean;
  onClose: () => void;
  dateStr: string;
  dayEvents?: DayEvents;
  babyId?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: eventTypes } = useEventTypes();
  const { data: foodCatalog } = useFoodCatalog();
  const scrollRef = useRef<ScrollView>(null);
  const parts = useMemo(() => dateStr.split("-").map(Number), [dateStr]);
  const dayStart = useMemo(() => new Date(parts[0], parts[1] - 1, parts[2]), [parts]);
  const dayEnd = useMemo(() => new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999), [parts]);

  const { data: dayEventsRaw, isLoading } = useQuery({
    queryKey: ["dayEvents", babyId, dateStr],
    enabled: !!babyId && visible,
    queryFn: async () => {
      if (!babyId) return null;
      const db = getDb();
      const [events, feedings, sleeps, growths, foods] = await Promise.all([
        db
          .select()
          .from(timelineEvents)
          .where(and(eq(timelineEvents.babyId, babyId), gte(timelineEvents.timestamp, dayStart), lte(timelineEvents.timestamp, dayEnd)))
          .orderBy(timelineEvents.timestamp),
        db
          .select()
          .from(feedingSessions)
          .where(and(eq(feedingSessions.babyId, babyId), gte(feedingSessions.startedAt, dayStart), lte(feedingSessions.startedAt, dayEnd)))
          .orderBy(feedingSessions.startedAt),
        db
          .select()
          .from(sleepSessions)
          .where(and(eq(sleepSessions.babyId, babyId), gte(sleepSessions.startedAt, dayStart), lte(sleepSessions.startedAt, dayEnd)))
          .orderBy(sleepSessions.startedAt),
        db
          .select()
          .from(growthLogs)
          .where(and(eq(growthLogs.babyId, babyId), gte(growthLogs.timestamp, dayStart), lte(growthLogs.timestamp, dayEnd)))
          .orderBy(growthLogs.timestamp),
        db
          .select()
          .from(foodLogs)
          .where(and(eq(foodLogs.babyId, babyId), gte(foodLogs.timestamp, dayStart), lte(foodLogs.timestamp, dayEnd)))
          .orderBy(foodLogs.timestamp),
      ]);
      return { events, feedings, sleeps, growths, foods };
    },
  });

  const dayName = useMemo(() => {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  }, [parts]);

  const totalFeedMs = useMemo(() => {
    if (!dayEventsRaw) return 0;
    return dayEventsRaw.feedings.reduce((acc, f) => {
      if (f.status !== "finished" || !f.endedAt) return acc;
      return acc + (new Date(f.endedAt).getTime() - new Date(f.startedAt).getTime());
    }, 0);
  }, [dayEventsRaw]);

  const totalSleepMs = useMemo(() => {
    if (!dayEventsRaw) return 0;
    return dayEventsRaw.sleeps.reduce((acc, s) => {
      if (s.status !== "finished" || !s.endedAt) return acc;
      return acc + (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime());
    }, 0);
  }, [dayEventsRaw]);

  const allItems = useMemo(() => {
    if (!dayEventsRaw) return [];
    const items: { id: string; ts: Date; render: () => React.ReactNode }[] = [];

    for (const f of dayEventsRaw.feedings) {
      const duration = f.endedAt ? formatDuration(Math.round((new Date(f.endedAt).getTime() - new Date(f.startedAt).getTime()) / 1000)) : "en curso";
      const typeLabel = f.type === "bottle" ? "Biberón" : f.type === "breast_left" ? "Pecho Izq." : "Pecho Der.";
      const emoji = f.type === "bottle" ? "🍼" : "🤱";
      const color = f.type === "bottle" ? c.feeding?.bottle ?? "#7CB342" : "#E07B9C";
      items.push({
        id: `f-${f.id}`, ts: new Date(f.startedAt),
        render: () => (
          <TouchableOpacity
            onPress={() => { onClose(); router.push(`/logs/feeding/${f.id}`); }}
            style={itemRow}
          >
            <View style={[dotCircle, { backgroundColor: color + "20", borderColor: color }]}>
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </View>
            <View style={itemBody}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>{typeLabel}</Text>
                <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(f.startedAt)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                <MetaTag label={"⏱ " + duration} />
                {f.notes && <MetaTag label={f.notes} bg={c.elevated} color={c.textMuted} />}
              </View>
            </View>
          </TouchableOpacity>
        ),
      });
    }

    for (const s of dayEventsRaw.sleeps) {
      const duration = s.endedAt ? formatDuration(Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)) : "en curso";
      items.push({
        id: `s-${s.id}`, ts: new Date(s.startedAt),
        render: () => (
          <TouchableOpacity
            onPress={() => { onClose(); router.push(`/logs/sleep/${s.id}`); }}
            style={itemRow}
          >
            <View style={[dotCircle, { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" }]}>
              <Text style={{ fontSize: 16 }}>😴</Text>
            </View>
            <View style={itemBody}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>Sueño</Text>
                <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(s.startedAt)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                <MetaTag label={"⏱ " + duration} />
                {s.notes && <MetaTag label={s.notes} bg={c.elevated} color={c.textMuted} />}
              </View>
            </View>
          </TouchableOpacity>
        ),
      });
    }

    for (const g of dayEventsRaw.growths) {
      const line: string[] = [];
      if (g.weightGrams) line.push(`⚖️ ${(g.weightGrams / 1000).toFixed(2)} kg`);
      if (g.heightMm) line.push(`📏 ${(g.heightMm / 10).toFixed(1)} cm`);
      if (g.headCircMm) line.push(`📐 ${(g.headCircMm / 10).toFixed(1)} cm`);
      items.push({
        id: `g-${g.id}`, ts: new Date(g.timestamp),
        render: () => (
          <View style={itemRow}>
            <View style={[dotCircle, { backgroundColor: "#FFF3E0", borderColor: "#FF9800" }]}>
              <Text style={{ fontSize: 16 }}>📏</Text>
            </View>
            <View style={itemBody}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>Medición</Text>
                <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(g.timestamp)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                {line.map((l, i) => <MetaTag key={i} label={l} bg="#FFF8E1" color="#F57C00" />)}
              </View>
            </View>
          </View>
        ),
      });
    }

    for (const f of dayEventsRaw.foods) {
      const food = foodCatalog?.find((fc) => fc.id === f.foodId);
      items.push({
        id: `fo-${f.id}`, ts: new Date(f.timestamp),
        render: () => (
          <View style={itemRow}>
            <View style={[dotCircle, { backgroundColor: "#F1F8E9", borderColor: "#7CB342" }]}>
              <Text style={{ fontSize: 16 }}>🍽️</Text>
            </View>
            <View style={itemBody}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>
                  {food?.emoji ?? ""} {food?.name ?? f.foodId}
                </Text>
                <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(f.timestamp)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                {f.isFirst && <MetaTag label="🥇 Primera vez" bg="#FFF8E1" color="#F57C00" />}
                {f.reaction && <MetaTag label={"😋 " + f.reaction} bg={c.elevated} color={c.textMuted} />}
              </View>
            </View>
          </View>
        ),
      });
    }

    for (const e of dayEventsRaw.events) {
      const evType = eventTypes?.find((t) => t.id === e.eventTypeId);
      const emoji = evType?.emoji ?? "📝";
      const label = evType?.label ?? e.eventTypeId;
      const meta: Record<string, any> = typeof e.metadata === "string" ? safeJsonParse(e.metadata, {}) : (e.metadata || {});
      const vals: Record<string, any> = typeof e.values === "string" ? safeJsonParse(e.values, {}) : (e.values || {});
      const isAlert = e.eventTypeId === "diaper" && hasDiaperAlert(meta);
      const tags: { label: string; bg: string; color: string }[] = [];

      if (e.eventTypeId === "diaper") {
        const pi = vals?.poop ?? meta?.poopIntensity ?? 0;
        const ph = vals?.poopHealth ?? meta?.poopHealth ?? 0;
        const pc = vals?.poopConsistency ?? meta?.poopConsistency ?? 0;
        const pee = vals?.pee ?? meta?.peeIntensity ?? 0;
        const peeH = vals?.peeHealth ?? meta?.peeHealth ?? 0;

        if (pi > 0) {
          const z = meta?.poopIntensityZone;
          tags.push({ label: z ? `${z.emoji} ${z.label}` : `💩 ${pi}`, bg: "#FFF3E0", color: "#E65100" });
        }
        if (pc > 0) {
          const z = meta?.poopConsistencyZone;
          tags.push({ label: z ? `${z.emoji} ${z.label}` : `📊 ${pc}`, bg: "#FFF8E1", color: "#F57C00" });
        }
        if (ph > 0) {
          const z = meta?.poopHealthZone;
          tags.push({ label: z ? `${z.emoji} ${z.label}` : `🩺 ${ph}`, bg: ph >= 5 ? "#FFEBEE" : "#E8F5E9", color: ph >= 5 ? "#C62828" : "#2E7D32" });
        }
        if (pee > 0) {
          const z = meta?.peeIntensityZone;
          tags.push({ label: z ? `${z.emoji} ${z.label}` : `💧 ${pee}`, bg: "#E3F2FD", color: "#1565C0" });
        }
        if (peeH > 0) {
          const z = meta?.peeHealthZone;
          tags.push({ label: z ? `${z.emoji} ${z.label}` : `🧪 ${peeH}`, bg: peeH >= 7 ? "#FFEBEE" : "#E8F5E9", color: peeH >= 7 ? "#C62828" : "#2E7D32" });
        }
        if (e.notes) tags.push({ label: e.notes, bg: c.elevated, color: c.textMuted });
      } else if (vals && typeof vals === "object") {
        for (const [k, v] of Object.entries(vals)) {
          if (typeof v === "number" && v > 0) tags.push({ label: `${k}: ${v}`, bg: c.elevated, color: c.textMuted });
        }
        if (e.notes) tags.push({ label: e.notes, bg: c.elevated, color: c.textMuted });
      } else if (e.notes) {
        tags.push({ label: e.notes, bg: c.elevated, color: c.textMuted });
      }

      const dotColor = isAlert ? "#E53935" : e.eventTypeId === "diaper" ? "#AB47BC" : c.accent;
      items.push({
        id: `e-${e.id}`, ts: new Date(e.timestamp),
        render: () => (
          <TouchableOpacity
            onPress={() => { onClose(); router.push(e.eventTypeId === "diaper" ? `/logs/diaper/${e.id}` : `/logs/event/${e.id}`); }}
            style={itemRow}
          >
            <View style={[dotCircle, { backgroundColor: dotColor + "18", borderColor: dotColor }]}>
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </View>
            <View style={itemBody}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>{label}</Text>
                <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(e.timestamp)}</Text>
                {isAlert && <Text style={{ fontSize: 12 }}>🚨</Text>}
              </View>
              {tags.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {tags.map((t, i) => (
                    <MetaTag key={i} label={t.label} bg={t.bg} color={t.color} />
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
        ),
      });
    }

    items.sort((a, b) => a.ts.getTime() - b.ts.getTime());
    return items;
  }, [dayEventsRaw, eventTypes, foodCatalog, c, onClose]);

  useEffect(() => {
    if (!isLoading && allItems.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [isLoading, allItems.length]);

  function hasDiaperAlert(meta: any): boolean {
    if (meta?.peeHealthAlert || meta?.poopHealthAlert || meta?.poopConsistencyAlert) return true;
    const ph = meta?.peeHealth ?? 0;
    const poh = meta?.poopHealth ?? 0;
    const pc = meta?.poopConsistency;
    if (ph >= 7) return true;
    if (poh >= 5) return true;
    if (pc === 1 || pc === 5) return true;
    return false;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ display: "flex", height: "100%", backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }} onPress={onClose}>
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80%", paddingTop: 12 }}>
          <View style={{ width: 40, height: 4, backgroundColor: c.accent + "4D", borderRadius: 99, alignSelf: "center", marginBottom: 8 }} />
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: c.textBody, textTransform: "capitalize" }}>{dayName}</Text>
          </View>

          {dayEvents && (
            <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 20, marginBottom: 16 }}>
              <StatCard emoji="🍑" label="Pañales" value={`${dayEvents.total}`} />
              <StatCard emoji="🤱" label="Tomas" value={`${dayEventsRaw?.feedings.length ?? 0}`} />
              <StatCard emoji="🍎" label="Comidas" value={`${dayEventsRaw?.foods.length ?? 0}`} />
              <StatCard emoji="😴" label="Sueño" value={totalSleepMs > 0 ? formatDuration(Math.round(totalSleepMs / 1000)) : "0m"} />
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator color={c.accent} style={{ padding: 20 }} />
          ) : allItems.length === 0 ? (
            <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14, textAlign: "center", padding: 40 }}>
              Sin eventos este día
            </Text>
          ) : (
            <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 8 }}>
              <View style={{ paddingLeft: 24, gap: 2 }}>
                {allItems.map((item) => (
                  <View key={item.id}>{item.render()}</View>
                ))}
              </View>
            </ScrollView>
          )}

          <TouchableOpacity onPress={onClose} style={{ alignItems: "center", paddingVertical: 14, minHeight: 48 }}>
            <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 15 }}>Cerrar</Text>
          </TouchableOpacity>
        </View>

      </Pressable>
    </Modal>
  );
}

const formatTime = (ts: Date | number) =>
  new Date(ts).toLocaleTimeString("es-MX", timeOptions());

const itemRow: ViewStyle = {
  flexDirection: "row", alignItems: "flex-start", gap: 12,
  paddingVertical: 8, paddingRight: 16, minHeight: 56,
};
const dotCircle: ViewStyle = {
  width: 36, height: 36, borderRadius: 18, borderWidth: 2,
  alignItems: "center", justifyContent: "center",
};
const itemBody: ViewStyle = {
  flex: 1, backgroundColor: "#FAFAFA", borderRadius: 14,
  padding: 10, borderWidth: 1, borderColor: "#F0F0F0",
};

function MiniWeekChart({
  data,
  colors,
  onDayPress,
}: {
  data: { dateKey: string; diapers: number; feeds: number; sleepMs: number; foods: number }[];
  colors: { diapers: string; feeds: string; sleep: string; foods: string };
  onDayPress?: (dateKey: string) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const maxSleep = Math.max(1, ...data.map((d) => d.sleepMs));
  const barH = 60;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <LegendDot color={colors.diapers} label="Pañal" />
        <LegendDot color={colors.feeds} label="Toma" />
        <LegendDot color={colors.sleep} label="Sueño" />
        <LegendDot color={colors.foods} label="Comida" />
      </View>
      <View style={{ flexDirection: "row", height: barH + 20 }}>
        {data.map((day) => {
          const barW = Math.max(4, Math.min(12, 60 / data.length));
          const sh = barH * (day.sleepMs / maxSleep);
          const dh = Math.min(barH * 0.45, Math.max(4, day.diapers * 8));
          const fh = Math.min(barH * 0.45, Math.max(4, day.feeds * 8));
          const label = day.dateKey.split("-")[2];
          const isToday = new Date().toISOString().slice(0, 10) === day.dateKey;
          return (
            <TouchableOpacity
              key={day.dateKey}
              onPress={() => onDayPress?.(day.dateKey)}
              disabled={!onDayPress}
              style={{ flex: 1, alignItems: "center", gap: 1 }}
            >
              <View style={{ height: barH, justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
                <View style={{ width: barW * 0.7, height: fh, backgroundColor: colors.feeds, borderRadius: 2, minHeight: 2 }} />
                <View style={{ width: barW * 0.7, height: dh, backgroundColor: colors.diapers, borderRadius: 2, minHeight: 2 }} />
                <View style={{ width: barW, height: sh, backgroundColor: colors.sleep, borderRadius: 2, minHeight: 2 }} />
              </View>
              <Text style={{ fontSize: 9, fontWeight: isToday ? "800" : "600", color: isToday ? c.accent : c.textMuted }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>{label}</Text>
    </View>
  );
}

function MetaTag({ label, color = "#FF5C9A", bg = "#FFF0F5" }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color }}>{label}</Text>
    </View>
  );
}

export default function AnalisisScreen() {
  const { theme } = useTheme();
  const { data: baby } = useActiveBaby();
  const tl = useTimeline(baby?.id, 300);
  const c = theme.colors;

  const [calRef, setCalRef] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const { data: calData, isLoading: calLoading } = useCalendarData(baby?.id, calRef);

  const calYear = calRef.getFullYear();
  const calMonth = calRef.getMonth();

  const handlePrevMonth = useCallback(() => {
    setCalRef(new Date(calYear, calMonth - 1, 1));
  }, [calYear, calMonth]);
  const handleNextMonth = useCallback(() => {
    setCalRef(new Date(calYear, calMonth + 1, 1));
  }, [calYear, calMonth]);
  const handleToday = useCallback(() => {
    setCalRef(new Date());
  }, []);

  const handleSelectDay = useCallback((dateStr: string) => {
    setSelectedDay(dateStr);
    setShowSheet(true);
  }, []);

  const todaySummary = useMemo(() => {
    if (!tl.data) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = tl.data.filter((e) => new Date(e.timestamp) >= today);
    return {
      diapers: todayEvents.filter((e) => e.eventTypeId === "diaper").length,
      withPoop: todayEvents.filter((e) => {
        const meta = e.metadata as any;
        return meta?.poopIntensity > 0 || meta?.poopHealth > 0;
      }).length,
      events: todayEvents.length,
    };
  }, [tl.data]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay || !calData) return undefined;
    return calData.days.get(selectedDay);
  }, [selectedDay, calData]);

  const { data: weekData } = useQuery({
    queryKey: ["weekSummary", baby?.id],
    enabled: !!baby?.id,
    queryFn: async () => {
      if (!baby?.id) return [];
      const db = getDb();
      const days: { dateKey: string; diapers: number; feeds: number; sleepMs: number; foods: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        const [events, feedings, sleeps, foods] = await Promise.all([
          db.select().from(timelineEvents)
            .where(and(eq(timelineEvents.babyId, baby.id), gte(timelineEvents.timestamp, start), lte(timelineEvents.timestamp, end)))
            .orderBy(timelineEvents.timestamp),
          db.select().from(feedingSessions)
            .where(and(eq(feedingSessions.babyId, baby.id), gte(feedingSessions.startedAt, start), lte(feedingSessions.startedAt, end))),
          db.select().from(sleepSessions)
            .where(and(eq(sleepSessions.babyId, baby.id), gte(sleepSessions.startedAt, start), lte(sleepSessions.startedAt, end))),
          db.select().from(foodLogs)
            .where(and(eq(foodLogs.babyId, baby.id), gte(foodLogs.timestamp, start), lte(foodLogs.timestamp, end))),
        ]);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const sleepMs = sleeps.reduce((acc, s) => {
          if (s.status !== "finished" || !s.endedAt) return acc;
          return acc + (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime());
        }, 0);
        days.push({
          dateKey,
          diapers: events.filter((e) => e.eventTypeId === "diaper").length,
          feeds: feedings.length,
          sleepMs,
          foods: foods.length,
        });
      }
      return days;
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>📊 Análisis</Text>
          {baby && (
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.textMuted, marginTop: 2 }}>
              {baby.nickname || baby.name} · {calcAge(baby.birthDate).label}
            </Text>
          )}
        </View>

        {baby ? (
          <>
            <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: c.elevated }}>
              {calLoading ? (
                <ActivityIndicator color={c.accent} style={{ padding: 20 }} />
              ) : (
                <CalendarGrid
                  year={calYear}
                  month={calMonth}
                  today={new Date()}
                  days={calData?.days ?? new Map()}
                  selected={selectedDay}
                  onSelectDay={handleSelectDay}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onToday={handleToday}
                />
              )}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>Hoy</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatCard emoji="🍑" label="Pañales" value={`${todaySummary?.diapers ?? 0}`} />
                <StatCard emoji="💩" label="Con popó" value={`${todaySummary?.withPoop ?? 0}`} />
                <StatCard emoji="📝" label="Eventos" value={`${todaySummary?.events ?? 0}`} />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>Esta semana</Text>
              {weekData ? (
                <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: c.elevated }}>
                  <MiniWeekChart
                    data={weekData}
                    colors={{ diapers: "#AB47BC", feeds: "#E07B9C", sleep: "#4CAF50", foods: "#7CB342" }}
                    onDayPress={(dateKey) => {
                      setSelectedDay(dateKey);
                      setShowSheet(true);
                    }}
                  />
                </View>
              ) : (
                <ActivityIndicator color={c.accent} />
              )}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>Explorar</Text>
              <View style={{ gap: 8 }}>
                <QuickLink emoji="📊" label="Estadísticas completas" onPress={() => router.push("/stats")} />
                <QuickLink emoji="📋" label="Historial completo" onPress={() => router.push("/history")} />
                <QuickLink emoji="📈" label="Crecimiento" onPress={() => router.push("/logs/growth/history")} />
                <QuickLink emoji="⏳" label="Ventanas de sueño" onPress={() => router.push("/wake-windows")} />
              </View>
            </View>
          </>
        ) : (
          <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: c.elevated }}>
            <Text style={{ fontSize: 32 }}>👶</Text>
            <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14, textAlign: "center" }}>
              Configura un bebé en Perfil para ver análisis
            </Text>
          </View>
        )}
      </ScrollView>

      <DaySheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        dateStr={selectedDay ?? ""}
        dayEvents={selectedDayEvents}
        babyId={baby?.id}
      />
    </SafeAreaView>
  );
}
