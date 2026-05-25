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
  Profile,
  EventType,
} from "@/src/db/schema";
import type {
  FeedingType,
  BottleSubtype,
} from "@/src/hooks/useFeedingSessions";
import type { EventMetric } from "@/src/units/types";
import { getUnit } from "@/src/units/registry";
import { formatWithUnit, findBestUnit, normalizeToBase } from "@/src/units/helpers";
import { useDiaperObservations } from "@/src/hooks/useTimeline";
import { useTheme } from "@/src/theme/useTheme";
import type { Role } from "@/src/constants/roles";

const ROLE_EMOJI: Record<Role, string> = {
  mama: "👩",
  papa: "👨",
  abue: "👴",
  nanny: "🧑‍🍼",
  bestie: "🦸",
};

const AVATAR_COLORS = ["#FF6B9D", "#845EC2", "#00C9A7", "#FF9671", "#FFC75F"];

function AvatarCircle({ profile }: { profile: Profile }) {
  const firstChar = profile.name.charAt(0).toUpperCase();
  const colorIndex = profile.name.length % AVATAR_COLORS.length;

  if (profile.avatarUri) {
    return (
      <Image
        source={{ uri: profile.avatarUri }}
        style={{ width: 36, height: 36, borderRadius: 18 }}
      />
    );
  }

  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: AVATAR_COLORS[colorIndex],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "800", color: "#FFF" }}>
        {firstChar}
      </Text>
    </View>
  );
}

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

function parseEventValues(values: string | null): Record<string, number> {
  if (!values) return {};
  try { return JSON.parse(values); } catch { return {}; }
}

function parseMetrics(json: string | null): EventMetric[] {
  if (!json) return [];
  try { const p = JSON.parse(json); return Array.isArray(p) ? p : []; } catch { return []; }
}

function BubbleFooter({
  isOwn,
  isFirstInGroup,
  profile,
  timestamp,
  accentColor,
}: {
  isOwn: boolean;
  isFirstInGroup: boolean;
  profile?: Profile;
  timestamp: Date | string | number;
  accentColor?: string;
}) {
  const c = useTheme().theme.colors;
  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 }}>
      {!isOwn && isFirstInGroup && profile && (
        <Text style={{ fontSize: 11, fontWeight: "800", color: accentColor ?? c.accentStrong, marginRight: 2 }}>
          {profile.name}
        </Text>
      )}
      <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: "700" }}>
        {formatTime(timestamp)}
      </Text>
      {isOwn && <Text style={{ fontSize: 10, color: "#34B7F1" }}>✓✓</Text>}
    </View>
  );
}

function ValueTags({ values, metrics }: { values: Record<string, number>; metrics: EventMetric[] }) {
  const c = useTheme().theme.colors;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {metrics.map((m) => {
        const v = values[m.id];
        if (v == null) return null;
        const unit = getUnit(m.unitId);
        let displayValue = v;
        let displayUnit = unit;
        if (unit && unit.dimension !== "dimensionless") {
          const baseValue = normalizeToBase(v, m.unitId);
          const best = findBestUnit(baseValue, unit.dimension);
          displayUnit = best.unit;
          displayValue = best.displayValue;
        }
        const label = displayUnit ? `${displayValue.toFixed(1)} ${displayUnit.symbol}` : `${displayValue.toFixed(1)}`;
        return <MetaTag key={m.id} label={`${m.name}: ${label}`} color={c.accentStrong} bg={c.accent + "20"} />;
      })}
    </View>
  );
}

export function TimelineBubble({
  event,
  eventType,
  isOwn,
  isFirstInGroup,
  profile,
  onPress,
}: {
  event: TimelineEvent;
  eventType?: EventType;
  isOwn: boolean;
  isFirstInGroup: boolean;
  profile?: Profile;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const { data: observations } = useDiaperObservations();
  const meta = event.metadata ? (() => { try { return JSON.parse(event.metadata); } catch { return null; } })() : null;
  const c = theme.colors;

  const eventValues = parseEventValues(event.values);
  const evMetrics = parseMetrics(eventType?.metrics ?? null);
  const hasValues = Object.keys(eventValues).length > 0 && evMetrics.length > 0;
  const emoji = eventType?.emoji ?? "📝";
  const label = eventType?.label ?? event.eventTypeId;

  const bubble = (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        maxWidth: isOwn || !profile || !isFirstInGroup ? "82%" : "76%",
        borderRadius: 18,
        borderBottomRightRadius: isOwn ? (isFirstInGroup ? 4 : 18) : 18,
        borderBottomLeftRadius: !isOwn ? (isFirstInGroup ? 4 : 18) : 18,
        padding: 12,
        paddingBottom: 8,
        backgroundColor: isOwn ? c.bubbleOwn : c.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <Text style={{ fontWeight: "900", fontSize: 14, color: c.textBody }}>{label}</Text>
      </View>

      {event.eventTypeId === "diaper" && meta && (
        <View style={{ marginBottom: 2 }}>
          {(meta.peeIntensity > 0 || (meta.peeHealth ?? 0) > 0) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 12 }}>💧</Text>
              {meta.peeIntensityZone?.label ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  {meta.peeIntensityZone.emoji} {meta.peeIntensityZone.label}
                </Text>
              ) : meta.peeIntensity > 0 ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  {Array.from({ length: meta.peeIntensity }, () => "💧").join("")}
                </Text>
              ) : null}
              {meta.peeHealthZone?.label ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  · {meta.peeHealthZone.emoji} {meta.peeHealthZone.label}
                </Text>
              ) : (meta.peeHealth ?? 0) > 0 ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  · {meta.peeHealth}/8
                </Text>
              ) : null}
            </View>
          )}

          {(meta.poopIntensity > 0 || (meta.poopHealth ?? 0) > 0 || meta.poopConsistency > 0) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 12 }}>💩</Text>
              {meta.poopIntensityZone?.label ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  {meta.poopIntensityZone.emoji} {meta.poopIntensityZone.label}
                </Text>
              ) : meta.poopIntensity > 0 ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  {Array.from({ length: meta.poopIntensity }, () => "💩").join("")}
                </Text>
              ) : null}
              {meta.poopConsistencyZone?.label ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  · {meta.poopConsistencyZone.emoji} {meta.poopConsistencyZone.label}
                </Text>
              ) : meta.poopConsistency > 0 ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  · {["", "Dura", "Sólida", "Pastosa", "Líquida", "Acuosa"][meta.poopConsistency]}
                </Text>
              ) : null}
              {meta.poopHealthZone?.label ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  · {meta.poopHealthZone.emoji} {meta.poopHealthZone.label}
                </Text>
              ) : (meta.poopHealth ?? 0) > 0 ? (
                <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600" }}>
                  · {meta.poopHealth}/5
                </Text>
              ) : null}
            </View>
          )}

          {(() => {
            const healthAlertTags: { label: string }[] = [];
            if (meta.peeHealthAlert) {
              const z = meta.peeHealthZone;
              healthAlertTags.push({ label: `💧 ${z?.label ?? "Alerta"}` });
            }
            if (meta.poopHealthAlert) {
              const z = meta.poopHealthZone;
              healthAlertTags.push({ label: `💩 ${z?.label ?? "Alerta"}` });
            }
            if (meta.poopConsistencyAlert) {
              const z = meta.poopConsistencyZone;
              healthAlertTags.push({ label: `💩 ${z?.label ?? "Alerta"}` });
            }

            const hasObservations = (meta.observationIds?.length ?? 0) > 0;

            if (healthAlertTags.length > 0 || hasObservations) {
              return (
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {healthAlertTags.map((t, i) => (
                    <MetaTag key={`health-${i}`} label={t.label} color={c.danger} bg={c.danger + "20"} />
                  ))}
                  {hasObservations && (meta.observationIds as string[]).map((id: string) => {
                    const obs = observations?.find((o) => o.id === id);
                    const obsMetrics = obs ? parseMetrics(obs.metrics) : [];
                    const obsValue = meta.observationValues?.[id];
                    const metricLabel = obs && obsMetrics.length > 0 && obsValue
                      ? (() => {
                          const m = obsMetrics[0];
                          const v = obsValue[m.id];
                          if (v != null) {
                            const zone = m.zones?.find((z) => v >= z.min && v <= z.max);
                            return zone ? `${obs.emoji} ${zone.label}` : `${obs.emoji} ${obs.label} ${v}`;
                          }
                          return null;
                        })()
                      : null;
                    const lbl = metricLabel ?? (obs ? `${obs.emoji} ${obs.label}` : id);
                    const zoneInfo = (() => {
                      if (!obsValue || !obsMetrics.length) return null;
                      const m = obsMetrics[0];
                      const v = obsValue[m.id];
                      if (v == null || !m.zones?.length) return null;
                      const idx = m.zones.findIndex((z) => v >= z.min && v <= z.max);
                      if (idx === -1) return null;
                      const total = m.zones.length;
                      if (idx === total - 1) return { color: c.danger, bg: c.danger + "20" };
                      if (idx === 0) return { color: c.textMuted, bg: c.surface };
                      return { color: c.warning, bg: c.warning + "20" };
                    })();
                    const tagStyle = zoneInfo ?? (obs?.isAlert ? { color: c.danger, bg: c.danger + "20" } : { color: c.textMuted, bg: c.surface });
                    return (
                      <MetaTag key={id} label={lbl} color={tagStyle.color} bg={tagStyle.bg} />
                    );
                  })}
                </View>
              );
            }
            return <MetaTag label="✅ Sin alertas" color={c.success} bg={c.success + "20"} />;
          })()}
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

      {hasValues && (
        <ValueTags values={eventValues} metrics={evMetrics} />
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

      <BubbleFooter
        isOwn={isOwn}
        isFirstInGroup={isFirstInGroup}
        profile={profile}
        timestamp={event.timestamp}
      />
    </TouchableOpacity>
  );

  if (isOwn) {
    return <View style={{ alignItems: "flex-end", marginBottom: isFirstInGroup ? 6 : 3 }}>{bubble}</View>;
  }

  return (
    <View style={{ flexDirection: "row", marginBottom: isFirstInGroup ? 6 : 3 }}>
      {isFirstInGroup && profile ? (
        <View style={{ marginRight: 8, justifyContent: "flex-end", paddingBottom: 4 }}>
          <AvatarCircle profile={profile} />
        </View>
      ) : (
        <View style={{ width: 44 }} />
      )}
      <View style={{ flex: 1, alignItems: "flex-start" }}>{bubble}</View>
    </View>
  );
}

export function FeedingSessionBubble({
  session, isOwn, isFirstInGroup, profile, onPress,
}: {
  session: FeedingSession;
  isOwn: boolean;
  isFirstInGroup: boolean;
  profile?: Profile;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const { emoji, label } = FEEDING_LABELS[session.type as FeedingType] ?? { emoji: "🍼", label: "Toma" };
  const subLabel = session.bottleSubtype ? BOTTLE_SUBTYPE_LABELS[session.bottleSubtype as BottleSubtype]?.label : null;
  const c = theme.colors;

  const bubble = (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        maxWidth: isOwn || !profile || !isFirstInGroup ? "82%" : "76%",
        borderRadius: 18,
        borderBottomRightRadius: isOwn ? (isFirstInGroup ? 4 : 18) : 18,
        borderBottomLeftRadius: !isOwn ? (isFirstInGroup ? 4 : 18) : 18,
        borderLeftWidth: 3,
        borderLeftColor: c.accentStrong,
        padding: 12,
        paddingLeft: 15,
        paddingBottom: 8,
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

      <BubbleFooter
        isOwn={isOwn}
        isFirstInGroup={isFirstInGroup}
        profile={profile}
        timestamp={session.startedAt}
      />
    </TouchableOpacity>
  );

  if (isOwn) {
    return <View style={{ alignItems: "flex-end", marginBottom: isFirstInGroup ? 6 : 3 }}>{bubble}</View>;
  }

  return (
    <View style={{ flexDirection: "row", marginBottom: isFirstInGroup ? 6 : 3 }}>
      {isFirstInGroup && profile ? (
        <View style={{ marginRight: 8, justifyContent: "flex-end", paddingBottom: 4 }}>
          <AvatarCircle profile={profile} />
        </View>
      ) : (
        <View style={{ width: 44 }} />
      )}
      <View style={{ flex: 1, alignItems: "flex-start" }}>{bubble}</View>
    </View>
  );
}

export function SleepSessionBubble({
  session, isOwn, isFirstInGroup, profile, onPress,
}: {
  session: SleepSession;
  isOwn: boolean;
  isFirstInGroup: boolean;
  profile?: Profile;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const INDIGO = "#818CF8";

  const bubble = (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        maxWidth: isOwn || !profile || !isFirstInGroup ? "82%" : "76%",
        borderRadius: 18,
        borderBottomRightRadius: isOwn ? (isFirstInGroup ? 4 : 18) : 18,
        borderBottomLeftRadius: !isOwn ? (isFirstInGroup ? 4 : 18) : 18,
        borderLeftWidth: 3,
        borderLeftColor: INDIGO,
        padding: 12,
        paddingLeft: 15,
        paddingBottom: 8,
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
          <Text style={{ fontSize: 11, color: INDIGO, fontWeight: "600" }}>Sueño completado</Text>
        </View>
      </View>

      {session.durationSec != null && (
        <View style={{ backgroundColor: INDIGO, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 4 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>💤 {formatDuration(session.durationSec)}</Text>
        </View>
      )}

      {session.notes && (
        <Text style={{ fontSize: 14, color: c.textBody, marginTop: 2 }}>{session.notes}</Text>
      )}

      <BubbleFooter
        isOwn={isOwn}
        isFirstInGroup={isFirstInGroup}
        profile={profile}
        timestamp={session.startedAt}
        accentColor={INDIGO}
      />
    </TouchableOpacity>
  );

  if (isOwn) {
    return <View style={{ alignItems: "flex-end", marginBottom: isFirstInGroup ? 6 : 3 }}>{bubble}</View>;
  }

  return (
    <View style={{ flexDirection: "row", marginBottom: isFirstInGroup ? 6 : 3 }}>
      {isFirstInGroup && profile ? (
        <View style={{ marginRight: 8, justifyContent: "flex-end", paddingBottom: 4 }}>
          <AvatarCircle profile={profile} />
        </View>
      ) : (
        <View style={{ width: 44 }} />
      )}
      <View style={{ flex: 1, alignItems: "flex-start" }}>{bubble}</View>
    </View>
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