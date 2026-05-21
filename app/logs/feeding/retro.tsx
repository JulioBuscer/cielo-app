import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import {
  FEEDING_LABELS,
  BOTTLE_SUBTYPE_LABELS,
  type FeedingType,
  type BottleSubtype,
} from "@/src/hooks/useFeedingSessions";
import { useQueryClient } from "@tanstack/react-query";
import { getDb } from "@/src/db/client";
import { feedingSessions, feedingStatusEvents } from "@/src/db/schema";
import { generateId } from "@/src/utils/id";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";

const FEEDING_TYPES: { id: FeedingType; emoji: string; label: string }[] = [
  { id: "breast_left", emoji: "🤱", label: "Pecho Izquierdo" },
  { id: "breast_right", emoji: "🤱", label: "Pecho Derecho" },
  { id: "bottle", emoji: "🍼", label: "Biberón" },
];

export default function FeedingRetroScreen() {
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const qc = useQueryClient();

  const [type, setType] = useState<FeedingType | null>(null);
  const [bottleSubtype, setBottleSubtype] = useState<BottleSubtype | null>(
    null
  );
  const [startedAt, setStartedAt] = useState(new Date());
  const [endedAt, setEndedAt] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!baby || !profile || !type) return;
    if (endedAt <= startedAt) {
      Alert.alert(
        "Error",
        "La hora de fin debe ser posterior a la hora de inicio"
      );
      return;
    }
    setSaving(true);
    try {
      const db = getDb();
      const profileId = profile.id;
      const now = new Date();
      const sessionId = generateId();
      const durationSec = Math.round(
        (endedAt.getTime() - startedAt.getTime()) / 1000
      );

      // Insert feeding session
      await db.insert(feedingSessions).values({
        id: sessionId,
        babyId: baby.id,
        profileId,
        type,
        bottleSubtype: type === "bottle" ? (bottleSubtype ?? null) : null,
        status: "finished",
        startedAt,
        endedAt,
        durationSec,
        createdAt: now,
      });

      // Insert status events (start + finish)
      await db.insert(feedingStatusEvents).values([
        {
          id: generateId(),
          sessionId,
          profileId,
          type: "start",
          timestamp: startedAt,
        },
        {
          id: generateId(),
          sessionId,
          profileId,
          type: "finish",
          timestamp: endedAt,
        },
      ]);

      qc.invalidateQueries({ queryKey: ["feeding_session"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });

      router.back();
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar la toma rezagada");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1A2E" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#1A1A2E",
          borderBottomWidth: 1,
          borderBottomColor: "#2A2A3E",
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "900",
            color: "#FFFFFF",
          }}
        >
          ⏱ Toma Rezagada
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        {/* Type selection */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: "#FF8AB3",
              fontWeight: "800",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Tipo de toma
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {FEEDING_TYPES.map((t) => {
              const isSelected = type === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    setType(t.id);
                    if (t.id !== "bottle") setBottleSubtype(null);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 99,
                    backgroundColor: isSelected ? "#FF8AB3" : "#2A2A3E",
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : "#BBBBBB",
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottle subtype */}
        {type === "bottle" && (
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: "#FF8AB3",
                fontWeight: "800",
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Subtipo de biberón
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(Object.entries(BOTTLE_SUBTYPE_LABELS) as [BottleSubtype, { emoji: string; label: string }][]).map(
                ([key, info]) => {
                  const isSelected = bottleSubtype === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setBottleSubtype(key)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 99,
                        backgroundColor: isSelected ? "#FF8AB3" : "#2A2A3E",
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{info.emoji}</Text>
                      <Text
                        style={{
                          color: isSelected ? "#FFFFFF" : "#BBBBBB",
                          fontWeight: "700",
                          fontSize: 14,
                        }}
                      >
                        {info.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>
        )}

        {/* Start time */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
            🕐 Hora de inicio
          </Text>
          <DateTimePicker value={startedAt} onChange={setStartedAt} />
        </View>

        {/* End time */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
            🕐 Hora de fin
          </Text>
          <DateTimePicker value={endedAt} onChange={setEndedAt} />
        </View>

        {/* Duration preview */}
        {type && endedAt > startedAt && (
          <View
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#888", fontWeight: "600", fontSize: 12 }}>
              Duración calculada
            </Text>
            <Text
              style={{ color: "#FF8AB3", fontWeight: "800", fontSize: 20 }}
            >
              {(() => {
                const sec = Math.round(
                  (endedAt.getTime() - startedAt.getTime()) / 1000
                );
                if (sec < 60) return `${sec}s`;
                const mins = Math.floor(sec / 60);
                const s = sec % 60;
                if (mins < 60)
                  return s > 0 ? `${mins}m ${s}s` : `${mins}m`;
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return m > 0 ? `${h}h ${m}m` : `${h}h`;
              })()}
            </Text>
          </View>
        )}

        <BigButton
          title={saving ? "Guardando..." : "💾 Guardar Toma Rezagada"}
          onPress={handleSave}
          disabled={saving || !type || endedAt <= startedAt}
          variant="primary"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
