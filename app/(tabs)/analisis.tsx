import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby, calcAge } from "@/src/hooks/useBaby";
import { useTimeline } from "@/src/hooks/useTimeline";
import { useTheme } from "@/src/theme/useTheme";

function StatCard({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string;
  label: string;
  value: string;
  color: string;
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
      <Text style={{ fontSize: 20, fontWeight: "900", color: c.textBody }}>
        {value}
      </Text>
      <Text
        style={{ fontSize: 11, fontWeight: "700", color: c.textMuted }}
      >
        {label}
      </Text>
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
      <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody, flex: 1 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 16, color: c.textMuted }}>›</Text>
    </TouchableOpacity>
  );
}

export default function AnalisisScreen() {
  const { theme } = useTheme();
  const { data: baby } = useActiveBaby();
  const tl = useTimeline(baby?.id, 300);
  const c = theme.colors;

  const todaySummary = useMemo(() => {
    if (!tl.data) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = tl.data.filter(
      (e) => new Date(e.timestamp) >= today
    );
    const diapers = todayEvents.filter((e) => e.eventTypeId === "diaper");
    const feedings = todayEvents.filter((e) => e.eventTypeId === "feeding");
    const sleeps = todayEvents.filter((e) => e.eventTypeId === "sleep");
    const measurements = todayEvents.filter((e) =>
      ["weight", "height"].includes(e.eventTypeId)
    );
    return {
      diapers: diapers.length,
      withPoop: diapers.filter((d) => {
        const meta = d.metadata as any;
        return meta?.poopIntensity > 0 || meta?.poopHealth > 0;
      }).length,
      events: todayEvents.length,
      lastMeasure: measurements.length > 0 ? measurements[measurements.length - 1] : null,
    };
  }, [tl.data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>
            📊 Análisis
          </Text>
          {baby && (
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.textMuted, marginTop: 2 }}>
              {baby.nickname || baby.name} · {calcAge(baby.birthDate).label}
            </Text>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>
            Hoy
          </Text>
          {baby ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <StatCard
                emoji="🍑"
                label="Pañales"
                value={`${todaySummary?.diapers ?? 0}`}
                color={c.warning}
              />
              <StatCard
                emoji="💩"
                label="Con popó"
                value={`${todaySummary?.withPoop ?? 0}`}
                color={c.biological.poop}
              />
              <StatCard
                emoji="📝"
                label="Eventos"
                value={`${todaySummary?.events ?? 0}`}
                color={c.accent}
              />
            </View>
          ) : (
            <View
              style={{
                backgroundColor: c.card,
                borderRadius: 16,
                padding: 24,
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 32 }}>👶</Text>
              <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14, textAlign: "center" }}>
                Configura un bebé en Perfil para ver análisis
              </Text>
            </View>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>
            Explorar
          </Text>
          <View style={{ gap: 8 }}>
            <QuickLink
              emoji="📊"
              label="Estadísticas completas"
              onPress={() => router.push("/stats")}
            />
            <QuickLink
              emoji="📏"
              label="Crecimiento"
              onPress={() => router.push("/logs/growth/history")}
            />
            <QuickLink
              emoji="📅"
              label="Calendario (próximamente)"
              onPress={() => {}}
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 16,
            padding: 20,
            gap: 10,
            borderWidth: 1,
            borderColor: c.elevated,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "800", color: c.textBody }}>
            🚧 Más funciones pronto
          </Text>
          <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 18 }}>
            Calendario mensual con dots de colores, resúmenes semanales, curvas
            de crecimiento OMS y gráficas interactivas están en camino.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
