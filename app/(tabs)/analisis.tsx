import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { timelineEvents, feedingSessions, sleepSessions, growthLogs } from "@/src/db/schema";
import { useActiveBaby, calcAge } from "@/src/hooks/useBaby";
import { useTimeline } from "@/src/hooks/useTimeline";
import { useTheme } from "@/src/theme/useTheme";
import { CalendarGrid } from "@/src/components/ui/CalendarGrid";
import { useCalendarData, type DayEvents } from "@/src/hooks/useCalendarData";
import { useEventTypes } from "@/src/hooks/useTimeline";

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
  const [parts] = useState(dateStr.split("-").map(Number));
  const dayStart = useMemo(() => new Date(parts[0], parts[1] - 1, parts[2]), [parts]);
  const dayEnd = useMemo(() => new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999), [parts]);

  const { data: dayEventsRaw, isLoading } = useQuery({
    queryKey: ["dayEvents", babyId, dateStr],
    enabled: !!babyId && visible,
    queryFn: async () => {
      if (!babyId) return null;
      const db = getDb();
      const [events, feedings, sleeps, growths] = await Promise.all([
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
      ]);
      return { events, feedings, sleeps, growths };
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: "80%" }}>
            <View style={{ width: 40, height: 4, backgroundColor: c.accent + "4D", borderRadius: 99, alignSelf: "center", marginBottom: 12 }} />
            <Text style={{ fontSize: 17, fontWeight: "900", color: c.textBody, marginBottom: 12, textTransform: "capitalize" }}>{dayName}</Text>

            {dayEvents && (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                <StatCard emoji="🍑" label="Pañales" value={`${dayEvents.total}`} />
                <StatCard emoji="🤱" label="Tomas" value={`${dayEventsRaw?.feedings.length ?? 0}`} />
                <StatCard emoji="😴" label="Sueño" value={totalSleepMs > 0 ? formatDuration(Math.round(totalSleepMs / 1000)) : "0m"} />
              </View>
            )}

            {isLoading ? (
              <ActivityIndicator color={c.accent} style={{ padding: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 0 }}>
                {(!dayEventsRaw || (dayEventsRaw.events.length === 0 && dayEventsRaw.feedings.length === 0 && dayEventsRaw.sleeps.length === 0 && dayEventsRaw.growths.length === 0)) && (
                  <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14, textAlign: "center", padding: 20 }}>
                    Sin eventos este día
                  </Text>
                )}
                {dayEventsRaw?.feedings.map((f) => {
                  const duration = f.endedAt ? formatDuration(Math.round((new Date(f.endedAt).getTime() - new Date(f.startedAt).getTime()) / 1000)) : "en curso";
                  const typeLabel = f.type === "bottle" ? "🍼 Biberón" : f.type === "breast_left" ? "🤱 Pecho Izq." : "🤱 Pecho Der.";
                  return (
                    <TouchableOpacity
                      key={`f-${f.id}`}
                      onPress={() => { onClose(); router.push(`/logs/feeding/${f.id}`); }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, minHeight: 44 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, width: 48 }}>{new Date(f.startedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</Text>
                      <Text style={{ fontSize: 20 }}>{f.type === "bottle" ? "🍼" : "🤱"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: c.textBody }}>{typeLabel}</Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{duration}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {dayEventsRaw?.sleeps.map((s) => {
                  const duration = s.endedAt ? formatDuration(Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)) : "en curso";
                  return (
                    <TouchableOpacity
                      key={`s-${s.id}`}
                      onPress={() => { onClose(); router.push(`/logs/sleep/${s.id}`); }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, minHeight: 44 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, width: 48 }}>{new Date(s.startedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</Text>
                      <Text style={{ fontSize: 20 }}>😴</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: c.textBody }}>Sueño</Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{duration}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {dayEventsRaw?.growths.map((g) => {
                  const parts: string[] = [];
                  if (g.weightGrams) parts.push(`${(g.weightGrams / 1000).toFixed(2)} kg`);
                  if (g.heightMm) parts.push(`${(g.heightMm / 10).toFixed(1)} cm`);
                  if (g.headCircMm) parts.push(`${(g.headCircMm / 10).toFixed(1)} cm CC`);
                  return (
                    <TouchableOpacity
                      key={`g-${g.id}`}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, minHeight: 44 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, width: 48 }}>{new Date(g.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</Text>
                      <Text style={{ fontSize: 20 }}>📏</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: c.textBody }}>Medición</Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{parts.join(" · ")}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {dayEventsRaw?.events.map((e) => {
                  const evType = eventTypes?.find((t) => t.id === e.eventTypeId);
                  const emoji = evType?.emoji ?? "📝";
                  const label = evType?.label ?? e.eventTypeId;
                  const meta = e.metadata as any;
                  const vals = e.values as any;
                  const details: string[] = [];
                  if (e.eventTypeId === "diaper") {
                    if (vals?.poop ?? meta?.poopIntensity ?? 0 > 0) details.push("💩");
                    if (vals?.pee ?? meta?.peeIntensity ?? 0 > 0) details.push("💧");
                    if (e.notes) details.push(e.notes);
                  } else if (vals) {
                    Object.entries(vals as Record<string, any>).forEach(([k, v]) => {
                      if (typeof v === "number" && v > 0) details.push(`${k}: ${v}`);
                    });
                  } else if (e.notes) {
                    details.push(e.notes);
                  }
                  return (
                    <TouchableOpacity
                      key={`e-${e.id}`}
                      onPress={() => { onClose(); router.push(e.eventTypeId === "diaper" ? `/logs/diaper/${e.id}` : `/logs/event/${e.id}`); }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, minHeight: 44 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, width: 48 }}>{new Date(e.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</Text>
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: c.textBody }}>{label}</Text>
                        {details.length > 0 && <Text style={{ fontSize: 11, color: c.textMuted }}>{details.join(" · ")}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity onPress={onClose} style={{ alignItems: "center", paddingVertical: 14, minHeight: 48, marginTop: 4 }}>
              <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 15 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>Explorar</Text>
              <View style={{ gap: 8 }}>
                <QuickLink emoji="📊" label="Estadísticas completas" onPress={() => router.push("/stats")} />
                <QuickLink emoji="📏" label="Crecimiento" onPress={() => router.push("/logs/growth/history")} />
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
