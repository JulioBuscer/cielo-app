import { useTheme } from "@/src/theme/useTheme";
import { timeOptions } from "@/src/utils/timeFormat";
import {
  View, Text, FlatList, StatusBar, TouchableOpacity,
} from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useFoodLogs, useFoodCatalog } from "@/src/hooks/useFoodLogs";

function DayHeader({ dateStr }: { dateStr: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let label: string;
  if (d.toDateString() === today.toDateString()) label = "Hoy";
  else if (d.toDateString() === yesterday.toDateString()) label = "Ayer";
  else label = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <View style={{ backgroundColor: c.accent + "33", borderRadius: 99, paddingHorizontal: 14, paddingVertical: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, textTransform: "capitalize" }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function FoodLogHistoryScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const { data: foods } = useFoodCatalog();
  const { data: logs } = useFoodLogs(baby?.id, 200);

  const grouped = (logs ?? []).reduce((acc, l) => {
    const day = new Date(l.timestamp).toDateString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(l);
    return acc;
  }, {} as Record<string, typeof logs>);

  const sortedDays = Object.entries(grouped).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "🍽️ Historial de comidas" }} />
      <StatusBar barStyle={parseInt(c.surface.replace("#","").slice(0,2),16) > 128 ? "dark-content" : "light-content"} />
      <FlatList
        data={sortedDays}
        keyExtractor={([day]) => day}
        contentContainerStyle={{ padding: 16, gap: 4 }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🍽️</Text>
            <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14, textAlign: "center" }}>
              No hay registro de alimentación complementaria aún.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const [day, entries = []] = item;
          const firstTimes = entries.filter((e) => e.isFirst).length;
          return (
            <View style={{ marginBottom: 8 }}>
              <DayHeader dateStr={day} />
              {entries.length > 0 && (
                <View style={{
                  flexDirection: "row", gap: 4, marginBottom: 8,
                  justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 11, color: c.textMuted }}>
                    {entries.length} alimento{entries.length !== 1 ? "s" : ""}
                  </Text>
                  {firstTimes > 0 && (
                    <Text style={{ fontSize: 11, color: c.textMuted }}>
                      · 🥇 {firstTimes} {firstTimes === 1 ? "primera vez" : "primeras veces"}
                    </Text>
                  )}
                </View>
              )}
              <View style={{ gap: 6 }}>
                {entries.map((entry) => {
                  const food = foods?.find((f) => f.id === entry.foodId);
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      activeOpacity={0.7}
                      onLongPress={() => {
                        const updatedFood = foods?.find((f) => f.id === entry.foodId);
                        if (updatedFood) {
                          router.push({
                            pathname: "/logs/food/new",
                            params: { preselectFoodId: updatedFood.id },
                          });
                        }
                      }}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 10,
                        padding: 12, backgroundColor: c.elevated,
                        borderRadius: 12, borderWidth: 1, borderColor: c.border,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{food?.emoji ?? "🍽️"}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>
                            {food?.name ?? entry.foodId}
                          </Text>
                          {entry.isFirst && (
                            <Text style={{ fontSize: 13 }}>🥇</Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>
                          {new Date(entry.timestamp).toLocaleTimeString("es-MX", timeOptions())}
                          {entry.reaction ? ` · ${entry.reaction}` : ""}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
