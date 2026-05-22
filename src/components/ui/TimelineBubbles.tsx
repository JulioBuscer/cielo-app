import { View, Text, TouchableOpacity, Image } from "react-native";
import { formatDuration } from "@/src/db/client";
import {
  FEEDING_LABELS,
  BOTTLE_SUBTYPE_LABELS,
} from "@/src/hooks/useFeedingSessions";
import type {
  TimelineEvent,
  FeedingSession,
  SleepSession,
} from "@/src/db/schema";
import type {
  FeedingType,
  BottleSubtype,
} from "@/src/hooks/useFeedingSessions";
import { useDiaperObservations } from "@/src/hooks/useTimeline";
import { useTheme } from "@/src/theme/useTheme";

function formatTime(date: Date | string | number) {
  return new Date(date).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetaTag({
  label,
  color = "#FF5C9A",
  bg = "#FFF0F5",
}: {
  label: string;
  color?: string;
  bg?: string;
}) {
  return (
    <View
      style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4, marginTop: 4 }}
    >
      <Text style={{ fontSize: 11, fontWeight: "800", color }}>{label}</Text>
    </View>
  );
}

export function TimelineBubble({
  event,
  eventTypeEmoji,
  eventTypeLabel,
  isOwn,
  profileName,
  onPress,
}: {
  event: TimelineEvent;
  eventTypeEmoji: string;
  eventTypeLabel: string;
  isOwn: boolean;
  profileName?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const { data: observations } = useDiaperObservations();
  const meta = event.metadata ? (() => { try { return JSON.parse(event.metadata); } catch { return null; } })() : null;
  const c = theme.colors;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ alignItems: isOwn ? "flex-end" : "flex-start", marginBottom: 6 }}
    >
      <View
        style={{
          maxWidth: "82%",
          borderRadius: 18,
          borderBottomRightRadius: isOwn ? 4 : 18,
          borderBottomLeftRadius: isOwn ? 18 : 4,
          padding: 10,
          paddingBottom: 6,
          backgroundColor: isOwn ? c.bubbleOwn : c.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.07,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 22 }}>{eventTypeEmoji}</Text>
          <Text style={{ fontWeight: "900", fontSize: 14, color: c.textBody }}>{eventTypeLabel}</Text>
        </View>

        {event.eventTypeId === "diaper" && meta && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <View style={{ flexDirection: "row", gap: 3 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <View
                    key={n}
                    style={{
                      width: 16, height: 16, borderRadius: 99,
                      backgroundColor: n <= (meta.peeIntensity ?? 0) ? c.biological.pee : c.elevated,
                    }}
                  />
                ))}
                <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "700", marginLeft: 4 }}>💧</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 3 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <View
                    key={n}
                    style={{
                      width: 16, height: 16, borderRadius: 99,
                      backgroundColor: n <= (meta.poopIntensity ?? 0) ? c.biological.poop : c.elevated,
                    }}
                  />
                ))}
                <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "700", marginLeft: 4 }}>💩</Text>
              </View>
            </View>

            {meta.observationIds?.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(meta.observationIds as string[]).map((id: string) => {
                  const obs = observations?.find((o) => o.id === id);
                  const isAlert = ["blood", "mucus", "diarrhea"].includes(id);
                  const label = obs ? `${obs.emoji} ${obs.label}` : id;
                  return (
                    <MetaTag key={id} label={label} color={isAlert ? c.danger : c.textMuted} bg={isAlert ? c.danger + "20" : c.surface} />
                  );
                })}
              </View>
            ) : (
              <MetaTag label="✅ Sin alertas" color={c.success} bg={c.success + "20"} />
            )}
          </View>
        )}

        {event.eventTypeId === "medication" && meta?.medicineName && (
          <MetaTag label={`${meta.medicineName}${meta.dose ? ` · ${meta.dose}` : ""}`} color={c.feeding.bottle} bg={c.feeding.bottle + "20"} />
        )}

        {event.eventTypeId === "temperature" && meta?.celsius && (
          <MetaTag label={`${meta.celsius} °C`} color={c.warning} bg={c.warning + "20"} />
        )}

        {(event.eventTypeId === "weight" || event.eventTypeId === "height") && meta && (
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {meta.weightGrams && <MetaTag label={`${(meta.weightGrams / 1000).toFixed(2)} kg`} color={c.growth} bg={c.growth + "20"} />}
            {meta.heightMm && <MetaTag label={`${(meta.heightMm / 10).toFixed(1)} cm`} color={c.growth} bg={c.growth + "20"} />}
          </View>
        )}

        {event.notes && (
          <Text style={{ fontSize: 14, color: c.textBody, marginTop: 4, lineHeight: 20 }}>{event.notes}</Text>
        )}

        {meta?.imageUri && (
          <Image
            source={{ uri: meta.imageUri }}
            style={{ alignSelf: "stretch", height: 150, borderRadius: 12, marginTop: 6, backgroundColor: c.surface }}
            resizeMode="cover"
          />
        )}

        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 }}>
          {profileName && (
            <Text style={{ fontSize: 12, fontWeight: "900", color: c.accentStrong }}>{profileName}</Text>
          )}
          <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: "600" }}>
            {formatTime(event.timestamp)}
          </Text>
          {isOwn && <Text style={{ fontSize: 11, color: "#34B7F1" }}>✓✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function FeedingSessionBubble({
  session, isOwn, profileName, onPress,
}: {
  session: FeedingSession;
  isOwn: boolean;
  profileName?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const { emoji, label } = FEEDING_LABELS[session.type as FeedingType] ?? { emoji: "🍼", label: "Toma" };
  const subLabel = session.bottleSubtype ? BOTTLE_SUBTYPE_LABELS[session.bottleSubtype as BottleSubtype]?.label : null;
  const c = theme.colors;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ alignItems: isOwn ? "flex-end" : "flex-start", marginBottom: 6 }}
    >
      <View
        style={{
          maxWidth: "82%",
          borderRadius: 18,
          borderBottomRightRadius: isOwn ? 4 : 18,
          borderBottomLeftRadius: isOwn ? 18 : 4,
          borderLeftWidth: 3,
          borderLeftColor: c.accentStrong,
          padding: 10,
          paddingLeft: 13,
          paddingBottom: 6,
          backgroundColor: isOwn ? c.bubbleOwn : c.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.07,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
          <View>
            <Text style={{ fontWeight: "900", fontSize: 14, color: c.textBody }}>
              {label}{subLabel ? ` · ${subLabel}` : ""}
            </Text>
            <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "600" }}>Toma completada</Text>
          </View>
        </View>

        {session.durationSec != null && (
          <View style={{ backgroundColor: c.accentStrong, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 4 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>
              ⏱ {formatDuration(session.durationSec)}
            </Text>
          </View>
        )}

        {session.notes && (
          <Text style={{ fontSize: 14, color: c.textBody, marginTop: 2 }}>{session.notes}</Text>
        )}

        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 }}>
          {profileName && (
            <Text style={{ fontSize: 12, fontWeight: "900", color: c.accentStrong }}>{profileName}</Text>
          )}
          <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: "600" }}>
            {formatTime(session.startedAt)}
          </Text>
          {isOwn && <Text style={{ fontSize: 11, color: "#34B7F1" }}>✓✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function SleepSessionBubble({
  session, isOwn, profileName, onPress,
}: {
  session: SleepSession;
  isOwn: boolean;
  profileName?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ alignItems: isOwn ? "flex-end" : "flex-start", marginBottom: 6 }}
    >
      <View
        style={{
          maxWidth: "82%",
          borderRadius: 18,
          borderBottomRightRadius: isOwn ? 4 : 18,
          borderBottomLeftRadius: isOwn ? 18 : 4,
          borderLeftWidth: 3,
          borderLeftColor: "#818CF8",
          padding: 10,
          paddingLeft: 13,
          paddingBottom: 6,
          backgroundColor: isOwn ? c.bubbleOwn : c.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.07,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Text style={{ fontSize: 22 }}>😴</Text>
          <View>
            <Text style={{ fontWeight: "900", fontSize: 14, color: c.textBody }}>Sesión de Sueño</Text>
            <Text style={{ fontSize: 11, color: "#6366F1", fontWeight: "600" }}>Sueño completado</Text>
          </View>
        </View>

        {session.durationSec != null && (
          <View style={{ backgroundColor: "#818CF8", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 4 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>💤 {formatDuration(session.durationSec)}</Text>
          </View>
        )}

        {session.notes && (
          <Text style={{ fontSize: 14, color: c.textBody, marginTop: 2 }}>{session.notes}</Text>
        )}

        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 }}>
          {profileName && (
            <Text style={{ fontSize: 10, fontWeight: "800", color: "#6366F1" }}>{profileName}</Text>
          )}
          <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: "600" }}>
            {formatTime(session.startedAt)}
          </Text>
          {isOwn && <Text style={{ fontSize: 11, color: "#34B7F1" }}>✓✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function DateSeparator({ date }: { date: Date | string | number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let label: string;
  if (d.toDateString() === today.toDateString()) label = "Hoy";
  else if (d.toDateString() === yesterday.toDateString()) label = "Ayer";
  else label = d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  return (
    <View style={{ alignItems: "center", marginVertical: 12 }}>
      <View style={{ backgroundColor: c.accent + "33", borderRadius: 99, paddingHorizontal: 14, paddingVertical: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted }}>{label}</Text>
      </View>
    </View>
  );
}

export function SystemBubble({ label }: { label: string }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ alignItems: "center", marginVertical: 3 }}>
      <View style={{ backgroundColor: c.accent + "1A", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted }}>{label}</Text>
      </View>
    </View>
  );
}
