import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby, useBabies, useSetActiveBaby, calcAge, STATUS_LABELS } from "@/src/hooks/useBaby";
import { useProfiles } from "@/src/hooks/useProfile";
import {
  useActiveFeedingSession,
  useFeedingHistory,
} from "@/src/hooks/useFeedingSessions";
import {
  useActiveSleepSession,
  useSleepHistory,
} from "@/src/hooks/useSleepSessions";
import { useTimeline } from "@/src/hooks/useTimeline";
import { useTheme } from "@/src/theme/useTheme";
import { timeOptions } from "@/src/utils/timeFormat";

function formatRelativeTime(date: Date | string | number) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function getLastActivityPreview(
  sessions: ReturnType<typeof useFeedingHistory>["data"],
  sleepHistory: ReturnType<typeof useSleepHistory>["data"],
  tlEvents: ReturnType<typeof useTimeline>["data"],
  profiles: ReturnType<typeof useProfiles>["data"],
) {
  const all: { ts: Date; preview: string; emoji: string }[] = [];

  for (const s of sessions ?? []) {
    if (s.status !== "finished") continue;
    all.push({
      ts: s.endedAt ?? s.startedAt,
      preview: `${s.durationSec ? Math.round(s.durationSec / 60) + "min" : ""}`,
      emoji: "🍼",
    });
  }
  for (const s of sleepHistory ?? []) {
    if (s.status !== "finished") continue;
    all.push({
      ts: s.endedAt ?? s.startedAt,
      preview: `${s.durationSec ? Math.round(s.durationSec / 60) + "min" : ""}`,
      emoji: "😴",
    });
  }
  for (const e of tlEvents ?? []) {
    const emojiMap: Record<string, string> = {
      diaper: "🍑",
      food: "🥦",
      temperature: "🌡️",
      medication: "💊",
      weight: "📏",
      height: "📏",
    };
    all.push({
      ts: e.timestamp,
      preview: e.notes ?? "",
      emoji: emojiMap[e.eventTypeId] ?? "📝",
    });
  }

  all.sort((a, b) => b.ts.getTime() - a.ts.getTime());
  const last = all[0];
  if (!last) return { preview: "Sin actividad aún", emoji: "👶", ts: null };
  return last;
}

let didInitialRedirect = false;

export default function ChatsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: babies } = useBabies();
  const { data: activeBaby } = useActiveBaby();
  const { data: allProfiles } = useProfiles();
  const setActive = useSetActiveBaby();
  const profileMap = useMemo(
    () => new Map(allProfiles?.map((p) => [p.id, p]) ?? []),
    [allProfiles],
  );

  const babyIds = useMemo(() => babies?.map((b) => b.id) ?? [], [babies]);

  const handleBabyPress = useCallback(
    (babyId: string) => {
      if (babyId !== activeBaby?.id) {
        setActive.mutate(babyId);
      }
      router.push(`/chat/${babyId}`);
    },
    [activeBaby?.id, setActive],
  );

  if (!babies) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.headerBg }}
        edges={["top"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (babies.length === 1 && !didInitialRedirect) {
    didInitialRedirect = true;
    const b = babies[0];
    if (b.id !== activeBaby?.id) setActive.mutate(b.id);
    return <Redirect href={`/chat/${b.id}`} />;
  }

  const canAddBaby = babies.length > 0;

  if (babies.length === 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.headerBg }}
        edges={["top"]}
      >
        <View
          style={{
            backgroundColor: c.headerBg,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "900",
              fontSize: 22,
            }}
          >
            💬 Chats
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backgroundColor: c.surface,
          }}
        >
          <Text style={{ fontSize: 56, marginBottom: 16 }}>👶</Text>
          <Text
            style={{
              color: c.textMuted,
              fontWeight: "700",
              fontSize: 16,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No hay bebés registrados
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            Agrega un bebé para empezar
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/baby")}
            style={{
              backgroundColor: c.accent,
              borderRadius: 14,
              paddingHorizontal: 24,
              paddingVertical: 14,
              minHeight: 48,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              ➕ Agregar bebé
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/settings/sync")}
            style={{
              marginTop: 12,
              borderRadius: 14,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderWidth: 1.5,
              borderColor: c.accent,
              minHeight: 48,
            }}
          >
            <Text
              style={{
                color: c.accent,
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              🔄 Sincronizar dispositivo
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.headerBg }}
      edges={["top"]}
    >
      <View
        style={{
          backgroundColor: c.headerBg,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "900",
            fontSize: 22,
            flex: 1,
          }}
        >
          💬 Cielo
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/settings/sync")}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 22, color: "rgba(255,255,255,0.85)" }}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 22, color: "rgba(255,255,255,0.85)" }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={babies}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: c.surface }}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={() => (
          <TouchableOpacity
            onPress={() => router.push("/settings/sync")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 8,
              backgroundColor: c.elevated,
              marginHorizontal: 12,
              marginTop: 12,
              borderRadius: 14,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: c.whatsGreen + "30",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18 }}>🔗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>
                Sincronizar dispositivo
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginTop: 1 }}>
                Conecta con otro celular
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: c.textMuted }}>›</Text>
          </TouchableOpacity>
        )}
        renderItem={({ item: baby }) => (
          <BabyChatItem
            baby={baby}
            isActive={baby.id === activeBaby?.id}
            profileMap={profileMap}
            onPress={() => handleBabyPress(baby.id)}
          />
        )}
      />

      {canAddBaby && (
        <TouchableOpacity
          onPress={() => router.push("/onboarding/baby")}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            bottom: 24,
            right: 20,
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: c.whatsGreen ?? "#25D366",
            alignItems: "center",
            justifyContent: "center",
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
          }}
        >
          <Text style={{ fontSize: 28, color: "#FFFFFF", lineHeight: 30 }}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function BabyChatItem({
  baby,
  isActive,
  profileMap,
  onPress,
}: {
  baby: NonNullable<ReturnType<typeof useBabies>["data"]>[0];
  isActive: boolean;
  profileMap: Map<string, any>;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const { data: activeFeeding } = useActiveFeedingSession(baby.id);
  const { data: activeSleep } = useActiveSleepSession(baby.id);
  const { data: sessions } = useFeedingHistory(baby.id, 5);
  const { data: sleepHistory } = useSleepHistory(baby.id, 5);
  const { data: tlEvents } = useTimeline(baby.id, 20);

  const lastActivity = getLastActivityPreview(
    sessions,
    sleepHistory,
    tlEvents,
    [...profileMap.values()],
  );

  const age = calcAge(baby.birthDate);
  const hasActive = activeFeeding || activeSleep;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: isActive ? c.accent + "10" : "transparent",
        borderBottomWidth: 0.5,
        borderBottomColor: c.elevated,
        minHeight: 72,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: isActive ? c.accent + "30" : c.elevated,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Text style={{ fontSize: 26 }}>
          {baby.avatarEmoji ?? "👶"}
        </Text>
        {hasActive && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: c.success,
              borderWidth: 2,
              borderColor: c.surface,
            }}
          />
        )}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            style={{
              fontWeight: "900",
              fontSize: 16,
              color: c.textBody,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {baby.nickname || baby.name}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: c.textMuted,
            }}
          >
            {age.label}
          </Text>
          {isActive && (
            <Text style={{ fontSize: 12, color: c.accentStrong }}>●</Text>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 14 }}>{lastActivity.emoji}</Text>
          <Text
            style={{
              fontSize: 13,
              color: c.textMuted,
              fontWeight: "600",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {hasActive
              ? activeFeeding
                ? "🍼 Comiendo..."
                : "😴 Durmiendo..."
              : lastActivity.preview || "Sin actividad"}
          </Text>
          {lastActivity.ts && (
            <Text
              style={{
                fontSize: 11,
                color: c.textDim,
                fontWeight: "600",
              }}
            >
              {formatRelativeTime(lastActivity.ts)}
            </Text>
          )}
        </View>

        {hasActive && (
          <View style={{ flexDirection: "row", gap: 4 }}>
            {activeFeeding && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: c.accent,
                }}
              >
                🍼 Toma activa
              </Text>
            )}
            {activeSleep && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: "#818CF8",
                }}
              >
                😴 Sueño activo
              </Text>
            )}
          </View>
        )}
      </View>

      <Text style={{ fontSize: 20, color: c.textDim }}>›</Text>
    </TouchableOpacity>
  );
}
