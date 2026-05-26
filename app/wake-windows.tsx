import { useMemo } from "react";
import { useTheme } from "@/src/theme/useTheme";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useSleepHistory } from "@/src/hooks/useSleepSessions";
import { useWakeWindows, getWakeReference, formatWakeWindow } from "@/src/hooks/useWakeWindows";

export default function WakeWindowsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const { data: sleepHistory } = useSleepHistory(baby?.id, 50);

  const wakeWindows = useWakeWindows(
    sleepHistory?.filter((s) => s.status === "finished") ?? [],
    baby ? new Date(baby.birthDate) : null,
  );

  const ageDays = baby ? Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000) : 0;
  const ref = getWakeReference(ageDays);

  const todayWindows = useMemo(() => {
    const today = new Date().toDateString();
    return wakeWindows.filter((w) => new Date(w.startMs).toDateString() === today);
  }, [wakeWindows]);

  const yesterdayWindows = useMemo(() => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    return wakeWindows.filter((w) => new Date(w.startMs).toDateString() === yesterday);
  }, [wakeWindows]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "⏳ Ventanas de sueño" }} />
      <StatusBar barStyle={parseInt(c.surface.replace("#","").slice(0,2),16) > 128 ? "dark-content" : "light-content"} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ backgroundColor: c.elevated, borderRadius: 16, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>
            📖 ¿Qué es una ventana de sueño?
          </Text>
          <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 18 }}>
            Es el tiempo que el bebé puede estar despierto entre siestas sin llegar a sobrecansancio.
            Varía según la edad. Respetarla ayuda a que se duerma más fácil.
          </Text>
        </View>

        <View style={{ backgroundColor: c.elevated, borderRadius: 16, padding: 16, gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: c.textBody }}>
            🎯 Para su edad ({Math.floor(ageDays / 30)} meses)
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "900", color: c.accent }}>
            {Math.floor(ref.minMin / 60)}h {ref.minMin % 60}m — {Math.floor(ref.maxMin / 60)}h {ref.maxMin % 60}m
          </Text>
          <Text style={{ fontSize: 12, color: c.textMuted }}>
            Tiempo recomendado despierto entre siestas
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>Hoy</Text>
          {todayWindows.length === 0 ? (
            <Text style={{ color: c.textMuted, fontSize: 13, padding: 8 }}>
              No hay suficientes siestas registradas hoy para calcular ventanas.
            </Text>
          ) : (
            todayWindows.map((ww, i) => {
              const min = Math.round(ww.durationMs / 60000);
              const inRange = min >= ref.minMin && min <= ref.maxMin;
              const tooLong = min > ref.maxMin;
              return (
                <View key={i} style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  padding: 12, backgroundColor: c.elevated, borderRadius: 12,
                  borderLeftWidth: 4, borderLeftColor: inRange ? "#4CAF50" : tooLong ? "#AB47BC" : "#6366F1",
                }}>
                  <Text style={{ fontSize: 20 }}>{i === 0 ? "🌅" : `☕${i + 1}`}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.textBody }}>
                      Ventana {i + 1}: {formatWakeWindow(ww.durationMs)}
                    </Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>
                      {new Date(ww.startMs).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} — {new Date(ww.endMs).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: inRange ? "#4CAF50" : tooLong ? "#AB47BC" : "#6366F1", marginTop: 2 }}>
                      {inRange ? "✅ Buen ritmo" : tooLong ? "🫶 Quizá ya tenía sueño" : "💤 Se durmió temprano"}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {yesterdayWindows.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody, opacity: 0.6 }}>Ayer</Text>
            {yesterdayWindows.map((ww, i) => {
              const min = Math.round(ww.durationMs / 60000);
              const inRange = min >= ref.minMin && min <= ref.maxMin;
              return (
                <View key={i} style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  padding: 12, backgroundColor: c.elevated, borderRadius: 12, opacity: 0.7,
                }}>
                  <Text style={{ fontSize: 16 }}>⏳</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.textBody }}>
                      {formatWakeWindow(ww.durationMs)} {inRange ? "✅" : "🫶"}
                    </Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>
                      {new Date(ww.startMs).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} — {new Date(ww.endMs).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ backgroundColor: c.elevated, borderRadius: 16, padding: 16, gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody }}>📚 Referencias</Text>
          <Text style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}>
            Basado en recomendaciones de Cleveland Clinic, National Sleep Foundation, HealthyChildren.org (AAP) y Yale Pediatric Sleep Center.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
