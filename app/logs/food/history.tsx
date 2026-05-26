import { useTheme } from "@/src/theme/useTheme";
import {
  View,
  Text,
  FlatList,
  StatusBar,
} from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useFoodLogs, useFoodCatalog } from "@/src/hooks/useFoodLogs";

export default function FoodLogHistoryScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const { data: foods } = useFoodCatalog();
  const { data: logs } = useFoodLogs(baby?.id, 200);

  const grouped = (logs ?? []).reduce((acc, l) => {
    const day = new Date(l.timestamp).toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(l);
    return acc;
  }, {} as Record<string, typeof logs>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "🍽️ Historial de comidas" }} />
      <StatusBar barStyle={parseInt(c.surface.replace("#","").slice(0,2),16) > 128 ? "dark-content" : "light-content"} />
      <FlatList
        data={Object.entries(grouped)}
        keyExtractor={([day]) => day}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🍽️</Text>
            <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14, textAlign: "center" }}>
              No hay registro de alimentación complementaria aún.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const [day, entries] = item;
          return (
          <View>
            <Text style={{
              fontSize: 13, fontWeight: "700", color: c.textMuted,
              marginBottom: 8, textTransform: "capitalize",
            }}>{day}</Text>
            <View style={{ gap: 6 }}>
              {entries?.map((entry) => {
                const food = foods?.find((f) => f.id === entry.foodId);
                return (
                  <View key={entry.id} style={{
                    flexDirection: "row", alignItems: "center", gap: 10,
                    padding: 12, backgroundColor: c.elevated,
                    borderRadius: 12, borderWidth: 1, borderColor: c.border,
                  }}>
                    <Text style={{ fontSize: 22 }}>{food?.emoji ?? "🍽️"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>
                        {food?.name ?? entry.foodId}
                        {entry.isFirst ? " 🥇" : ""}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.textMuted }}>
                        {new Date(entry.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        {entry.reaction ? ` · ${entry.reaction}` : ""}
                      </Text>
                    </View>
                  </View>
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
