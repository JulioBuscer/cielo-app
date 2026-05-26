import { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import type { DayEvents } from "@/src/hooks/useCalendarData";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

const DOT_MAP: [keyof DayEvents, string][] = [
  ["hasPoop", "💩"],
  ["hasPee", "💧"],
  ["hasFeeding", "🤱"],
  ["hasSleep", "😴"],
  ["hasMeasurement", "📏"],
  ["hasFood", "🍎"],
  ["hasHealth", "💊"],
  ["hasOther", "📝"],
];

function DayDots({ day }: { day: DayEvents }) {
  const dots = DOT_MAP.filter(([key]) => day[key as keyof DayEvents]);
  const visible = dots.slice(0, 5);
  const extra = dots.length - 4;
  return (
    <View style={{ flexDirection: "row", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
      {visible.map(([, emoji], i) => (
        <Text key={i} style={{ fontSize: 6.5 }}>{emoji}</Text>
      ))}
      {extra > 0 && (
        <Text style={{ fontSize: 5.5, color: "#999", fontWeight: "700" }}>+{extra}</Text>
      )}
    </View>
  );
}

export function CalendarGrid({
  year,
  month,
  today,
  days,
  selected,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
}: {
  year: number;
  month: number;
  today: Date;
  days: Map<string, DayEvents>;
  selected: string | null;
  onSelectDay: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const cells: (number | null)[][] = [];
    let row: (number | null)[] = [];

    for (let i = 0; i < startPad; i++) row.push(null);
    for (let d = 1; d <= totalDays; d++) {
      row.push(d);
      if (row.length === 7) {
        cells.push(row);
        row = [];
      }
    }
    if (row.length > 0) {
      while (row.length < 7) row.push(null);
      cells.push(row);
    }
    return cells;
  }, [year, month]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={onPrevMonth}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 22, color: c.textBody }}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToday}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 17, fontWeight: "900", color: c.textBody }}>
            {monthNames[month]} {year}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNextMonth}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 22, color: c.textBody }}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {WEEKDAYS.map((wd, i) => (
          <View
            key={i}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "800",
                color: c.textMuted,
              }}
            >
              {wd}
            </Text>
          </View>
        ))}
      </View>

      {grid.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row" }}>
          {row.map((day, ci) => {
            if (day === null) {
              return <View key={ci} style={{ flex: 1 }} />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = days.get(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selected;

            return (
              <TouchableOpacity
                key={ci}
                onPress={() => onSelectDay(dateStr)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 4,
                  gap: 2,
                  minHeight: 48,
                  backgroundColor: isSelected
                    ? c.accent + "18"
                    : isToday
                      ? c.accent + "0D"
                      : "transparent",
                  borderRadius: 8,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isToday ? c.accent : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isToday || isSelected ? "900" : "600",
                      color: isToday ? "#FFFFFF" : c.textBody,
                    }}
                  >
                    {day}
                  </Text>
                </View>
                {dayEvents && <DayDots day={dayEvents} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
