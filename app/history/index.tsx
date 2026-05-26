import { useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, ViewStyle, TextInput, Platform, KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { and, eq, gte, lte, desc, or, like } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { timelineEvents, feedingSessions, sleepSessions, growthLogs, foodLogs } from "@/src/db/schema";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useTheme } from "@/src/theme/useTheme";
import { useEventTypes } from "@/src/hooks/useTimeline";
import { useFoodCatalog } from "@/src/hooks/useFoodLogs";
import { timeOptions } from "@/src/utils/timeFormat";

type FilterType = "all" | "diaper" | "feeding" | "sleep" | "growth" | "food" | "other";
type FilterDate = "today" | "week" | "month" | "all" | "range";

const DATE_FILTERS: { key: FilterDate; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "7d" },
  { key: "month", label: "30d" },
  { key: "range", label: "📅 Rango" },
  { key: "all", label: "Todo" },
];

const TYPE_FILTERS: { key: FilterType; emoji: string; label: string }[] = [
  { key: "all", emoji: "📋", label: "Todo" },
  { key: "diaper", emoji: "🍑", label: "Pañal" },
  { key: "feeding", emoji: "🤱", label: "Toma" },
  { key: "sleep", emoji: "😴", label: "Sueño" },
  { key: "growth", emoji: "📏", label: "Medición" },
  { key: "food", emoji: "🍎", label: "Comida" },
  { key: "other", emoji: "📝", label: "Otros" },
];

export default function HistoryScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const { data: eventTypes } = useEventTypes();
  const { data: foodCatalog } = useFoodCatalog();

  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [dateFilter, setDateFilter] = useState<FilterDate>("week");
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d;
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });
  const [showDatePicker, setShowDatePicker] = useState<"start" | "end" | null>(null);

  const dateBounds = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (dateFilter === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start, end };
    }
    if (dateFilter === "week") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    if (dateFilter === "month") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    if (dateFilter === "range") {
      return { start: rangeStart, end: rangeEnd };
    }
    return { start: new Date(0), end };
  }, [dateFilter, rangeStart, rangeEnd]);

  const { data: raw, isLoading } = useQuery({
    queryKey: ["history", baby?.id, dateFilter, typeFilter, rangeStart.getTime(), rangeEnd.getTime()],
    enabled: !!baby?.id,
    queryFn: async () => {
      if (!baby?.id) return null;
      const db = getDb();
      const { start, end } = dateBounds;

      const [events, feedings, sleeps, growths, foods] = await Promise.all([
        db
          .select()
          .from(timelineEvents)
          .where(
            and(
              eq(timelineEvents.babyId, baby.id),
              gte(timelineEvents.timestamp, start),
              lte(timelineEvents.timestamp, end),
            )
          )
          .orderBy(desc(timelineEvents.timestamp)),
        db
          .select()
          .from(feedingSessions)
          .where(and(eq(feedingSessions.babyId, baby.id), gte(feedingSessions.startedAt, start), lte(feedingSessions.startedAt, end)))
          .orderBy(desc(feedingSessions.startedAt)),
        db
          .select()
          .from(sleepSessions)
          .where(and(eq(sleepSessions.babyId, baby.id), gte(sleepSessions.startedAt, start), lte(sleepSessions.startedAt, end)))
          .orderBy(desc(sleepSessions.startedAt)),
        db
          .select()
          .from(growthLogs)
          .where(and(eq(growthLogs.babyId, baby.id), gte(growthLogs.timestamp, start), lte(growthLogs.timestamp, end)))
          .orderBy(desc(growthLogs.timestamp)),
        db
          .select()
          .from(foodLogs)
          .where(and(eq(foodLogs.babyId, baby.id), gte(foodLogs.timestamp, start), lte(foodLogs.timestamp, end)))
          .orderBy(desc(foodLogs.timestamp)),
      ]);
      return { events, feedings, sleeps, growths, foods };
    },
  });

  const grouped = useMemo(() => {
    if (!raw) return [];

    let items: { id: string; ts: Date; dateKey: string; text: string; render: () => React.ReactNode }[] = [];

    for (const f of raw.feedings) {
      if (typeFilter === "food" || typeFilter === "other" || typeFilter === "growth" || typeFilter === "diaper") continue;
      if (typeFilter === "sleep") continue;
      const duration = f.endedAt
        ? formatDuration(Math.round((new Date(f.endedAt).getTime() - new Date(f.startedAt).getTime()) / 1000))
        : "en curso";
      const typeLabel = f.type === "bottle" ? "Biberón" : f.type === "breast_left" ? "Pecho Izq." : "Pecho Der.";
      const emoji = f.type === "bottle" ? "🍼" : "🤱";
      const color = f.type === "bottle" ? "#7CB342" : "#E07B9C";
      items.push({
        id: `f-${f.id}`, ts: new Date(f.startedAt), dateKey: toDateKey(f.startedAt),
        text: `${typeLabel} ${formatTime(f.startedAt)} ${f.notes ?? ""}`,
        render: () => (
          <TouchableOpacity
            onPress={() => router.push(`/logs/feeding/${f.id}`)}
            style={itemRow}
          >
            <View style={[dotCircle, { backgroundColor: color + "20", borderColor: color }]}>
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </View>
            <View style={itemBody}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>{typeLabel}</Text>
              <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(f.startedAt)} · ⏱ {duration}</Text>
              {f.notes && <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{f.notes}</Text>}
            </View>
          </TouchableOpacity>
        ),
      });
    }

    for (const s of raw.sleeps) {
      if (typeFilter === "food" || typeFilter === "other" || typeFilter === "growth" || typeFilter === "diaper") continue;
      if (typeFilter === "feeding") continue;
      const duration = s.endedAt
        ? formatDuration(Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000))
        : "en curso";
      items.push({
        id: `s-${s.id}`, ts: new Date(s.startedAt), dateKey: toDateKey(s.startedAt),
        text: `Sueño ${formatTime(s.startedAt)} ${s.notes ?? ""}`,
        render: () => (
          <TouchableOpacity
            onPress={() => router.push(`/logs/sleep/${s.id}`)}
            style={itemRow}
          >
            <View style={[dotCircle, { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" }]}>
              <Text style={{ fontSize: 16 }}>😴</Text>
            </View>
            <View style={itemBody}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>Sueño</Text>
              <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(s.startedAt)} · ⏱ {duration}</Text>
              {s.notes && <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{s.notes}</Text>}
            </View>
          </TouchableOpacity>
        ),
      });
    }

    for (const g of raw.growths) {
      if (typeFilter === "food" || typeFilter === "other" || typeFilter === "feeding" || typeFilter === "sleep" || typeFilter === "diaper") continue;
      const line: string[] = [];
      if (g.weightGrams) line.push(`⚖️ ${(g.weightGrams / 1000).toFixed(2)} kg`);
      if (g.heightMm) line.push(`📏 ${(g.heightMm / 10).toFixed(1)} cm`);
      if (g.headCircMm) line.push(`📐 ${(g.headCircMm / 10).toFixed(1)} cm`);
      items.push({
        id: `g-${g.id}`, ts: new Date(g.timestamp), dateKey: toDateKey(g.timestamp),
        text: `Medición ${line.join(" ")} ${formatTime(g.timestamp)}`,
        render: () => (
          <TouchableOpacity
            onPress={() => router.push(`/logs/growth/${g.id}`)}
            style={itemRow}
          >
            <View style={[dotCircle, { backgroundColor: "#FFF3E0", borderColor: "#FF9800" }]}>
              <Text style={{ fontSize: 16 }}>📏</Text>
            </View>
            <View style={itemBody}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>Medición</Text>
              <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(g.timestamp)}</Text>
              {line.length > 0 && (
                <Text style={{ fontSize: 12, color: "#F57C00", marginTop: 2 }}>{line.join(" · ")}</Text>
              )}
            </View>
          </TouchableOpacity>
        ),
      });
    }

    for (const f of raw.foods) {
      if (typeFilter === "feeding" || typeFilter === "sleep" || typeFilter === "growth" || typeFilter === "diaper") continue;
      if (typeFilter === "other") continue;
      const fFood = foodCatalog?.find((fc) => fc.id === f.foodId);
      items.push({
        id: `fo-${f.id}`, ts: new Date(f.timestamp), dateKey: toDateKey(f.timestamp),
        text: `Comida ${fFood?.name ?? f.foodId} ${f.reaction ?? ""} ${formatTime(f.timestamp)}`,
        render: () => (
          <View style={itemRow}>
            <View style={[dotCircle, { backgroundColor: "#F1F8E9", borderColor: "#7CB342" }]}>
              <Text style={{ fontSize: 16 }}>🍽️</Text>
            </View>
            <View style={itemBody}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>
                {fFood?.emoji ?? ""} {fFood?.name ?? f.foodId}
              </Text>
              <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(f.timestamp)}</Text>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
                {f.isFirst && <Text style={{ fontSize: 11, fontWeight: "700", color: "#F57C00" }}>🥇 Primera vez</Text>}
                {f.reaction && <Text style={{ fontSize: 11, color: c.textMuted }}>· 😋 {f.reaction}</Text>}
              </View>
            </View>
          </View>
        ),
      });
    }

    for (const e of raw.events) {
      const evType = eventTypes?.find((t) => t.id === e.eventTypeId);
      const cat = evType?.category;
      if (typeFilter === "food" || typeFilter === "feeding" || typeFilter === "sleep" || typeFilter === "growth") continue;
      if (typeFilter === "diaper" && e.eventTypeId !== "diaper") continue;
      if (typeFilter === "other" && cat !== "other" && cat !== "health") continue;

      const emoji = evType?.emoji ?? "📝";
      const label = evType?.label ?? e.eventTypeId;
      const isAlert = e.eventTypeId === "diaper" && hasDiaperAlert(e.metadata);
      const dotColor = isAlert ? "#E53935" : e.eventTypeId === "diaper" ? "#AB47BC" : c.accent;

      items.push({
        id: `e-${e.id}`, ts: new Date(e.timestamp), dateKey: toDateKey(e.timestamp),
        text: `${label} ${e.notes ?? ""} ${formatTime(e.timestamp)}`,
        render: () => (
          <TouchableOpacity
            onPress={() => router.push(e.eventTypeId === "diaper" ? `/logs/diaper/${e.id}` : `/logs/event/${e.id}`)}
            style={itemRow}
          >
            <View style={[dotCircle, { backgroundColor: dotColor + "18", borderColor: dotColor }]}>
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </View>
            <View style={itemBody}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>
                {label}
                {isAlert && <Text style={{ fontSize: 12 }}> 🚨</Text>}
              </Text>
              <Text style={{ fontSize: 11, color: c.textMuted }}>{formatTime(e.timestamp)}</Text>
              {e.notes && <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{e.notes}</Text>}
            </View>
          </TouchableOpacity>
        ),
      });
    }

    items.sort((a, b) => b.ts.getTime() - a.ts.getTime());

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      items = items.filter((it) => it.text.toLowerCase().includes(q));
    }

    return groupByDate(items);
  }, [raw, typeFilter, searchText, eventTypes, foodCatalog, c]);

  function hasDiaperAlert(meta: unknown): boolean {
    if (!meta) return false;
    const m = typeof meta === "string" ? JSON.parse(meta) : meta as any;
    if (m?.peeHealthAlert || m?.poopHealthAlert || m?.poopConsistencyAlert) return true;
    const ph = m?.peeHealth ?? 0;
    const poh = m?.poopHealth ?? 0;
    const pc = m?.poopConsistency;
    if (ph >= 7) return true;
    if (poh >= 5) return true;
    if (pc === 1 || pc === 5) return true;
    return false;
  }

  const count = useMemo(() => {
    if (!raw) return 0;
    return raw.events.length + raw.feedings.length + raw.sleeps.length + raw.growths.length + raw.foods.length;
  }, [raw]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>📋 Historial</Text>
          <TouchableOpacity onPress={() => setShowSearch((s) => !s)} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 20, color: c.accent }}>{showSearch ? "✕" : "🔍"}</Text>
          </TouchableOpacity>
        </View>

        {showSearch && (
          <View style={{
            flexDirection: "row", alignItems: "center", backgroundColor: c.card,
            borderRadius: 12, paddingHorizontal: 12, minHeight: 44,
            borderWidth: 1, borderColor: c.elevated,
          }}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Buscar..."
              placeholderTextColor={c.textMuted}
              style={{ fontSize: 15, flex: 1, color: c.textBody, paddingVertical: 8 }}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")} style={{ minHeight: 44, justifyContent: "center", paddingLeft: 8 }}>
                <Text style={{ fontSize: 14, color: c.textMuted }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setTypeFilter(f.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                backgroundColor: typeFilter === f.key ? c.accent : c.card,
                minHeight: 36,
                borderWidth: 1,
                borderColor: typeFilter === f.key ? c.accent : c.elevated,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: typeFilter === f.key ? "#fff" : c.textBody }}>
                {f.emoji} {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {DATE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setDateFilter(f.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99,
                backgroundColor: dateFilter === f.key ? c.accent + "20" : "transparent",
                minHeight: 34,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: dateFilter === f.key ? c.accent : c.textMuted }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={{ fontSize: 11, color: c.textMuted, alignSelf: "center" }}>
            {count} registros
          </Text>
        </ScrollView>

        {dateFilter === "range" && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowDatePicker("start")}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: c.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                minHeight: 44, borderWidth: 1, borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 13, color: c.textMuted }}>Desde</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody, flex: 1 }}>
                {rangeStart.toLocaleDateString("es-MX")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDatePicker("end")}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: c.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                minHeight: 44, borderWidth: 1, borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 13, color: c.textMuted }}>Hasta</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody, flex: 1 }}>
                {rangeEnd.toLocaleDateString("es-MX")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === "start" ? rangeStart : rangeEnd}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_event: DateTimePickerEvent, date?: Date) => {
            if (date) {
              if (showDatePicker === "start") {
                const d = new Date(date); d.setHours(0, 0, 0, 0); setRangeStart(d);
              } else {
                const d = new Date(date); d.setHours(23, 59, 59, 999); setRangeEnd(d);
              }
            }
            if (Platform.OS === "android") setShowDatePicker(null);
          }}
        />
      )}
      {Platform.OS === "ios" && showDatePicker && (
        <TouchableOpacity
          onPress={() => setShowDatePicker(null)}
          style={{ alignItems: "center", paddingVertical: 8, minHeight: 44 }}
        >
          <Text style={{ color: c.accent, fontWeight: "700", fontSize: 14 }}>Listo</Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <ActivityIndicator color={c.accent} style={{ padding: 40 }} />
      ) : grouped.length === 0 ? (
        <View style={{ padding: 40, alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 32 }}>🔍</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textMuted, textAlign: "center" }}>
            Sin resultados{searchText ? ` para "${searchText}"` : ""}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          style={{ flex: 1 }}
        >
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.dateKey}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: c.textBody, marginBottom: 8, textTransform: "capitalize" }}>
                {formatDateHeader(item.dateKey)}
              </Text>
              <View style={{ gap: 2 }}>
                {item.items.map((it) => (
                  <View key={it.id}>{it.render()}</View>
                ))}
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function toDateKey(ts: Date | number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateHeader(key: string): string {
  const d = new Date(key + "T12:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (toDateKey(today) === key) return "Hoy";
  if (toDateKey(yesterday) === key) return "Ayer";

  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDate(items: { id: string; ts: Date; dateKey: string; render: () => React.ReactNode }[]) {
  const map = new Map<string, typeof items>();
  for (const it of items) {
    const existing = map.get(it.dateKey) ?? [];
    existing.push(it);
    map.set(it.dateKey, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, its]) => ({ dateKey, items: its }));
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(ts: Date | number): string {
  return new Date(ts).toLocaleTimeString("es-MX", timeOptions());
}

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
