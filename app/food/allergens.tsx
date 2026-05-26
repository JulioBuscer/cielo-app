import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useAllergenTracking } from "@/src/hooks/useAllergenTracking";
import type { AllergenInfo } from "@/src/hooks/useAllergenTracking";

function formatDate(ts: Date | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const STATUS_CFG = {
  pending:    { emoji: "⏳", label: "Pendiente",    color: "#9E9E9E", bg: "#F5F5F5" },
  introduced: { emoji: "✅", label: "Introducido",  color: "#4CAF50", bg: "#E8F5E9" },
  reaction:   { emoji: "⚠️", label: "Con reacción", color: "#E53935", bg: "#FFEBEE" },
} as const;

function AllergenCard({ item, onPress }: { item: AllergenInfo; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const cfg = STATUS_CFG[item.status];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: c.card, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: c.elevated,
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.textBody }}>
            {item.label}
          </Text>
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
            {item.foods.map((f) => f.emoji || f.name).join(" · ") || "—"}
          </Text>
        </View>
        <View style={{
          backgroundColor: cfg.bg, borderRadius: 99,
          paddingHorizontal: 10, paddingVertical: 4,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: cfg.color }}>
            {cfg.emoji} {cfg.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AllergenDetail({ item, onClose }: { item: AllergenInfo; onClose: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const cfg = STATUS_CFG[item.status];

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
        <TouchableOpacity onPress={onClose} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24, color: c.textBody }}>‹ Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 40 }}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>{item.label}</Text>
            <View style={{
              alignSelf: "flex-start", backgroundColor: cfg.bg, borderRadius: 99,
              paddingHorizontal: 12, paddingVertical: 4, marginTop: 4,
            }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: cfg.color }}>
                {cfg.emoji} {cfg.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.elevated, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textMuted, textTransform: "uppercase" }}>
            Alimentos que lo contienen
          </Text>
          {item.foods.map((f) => (
            <View key={f.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 18 }}>{f.emoji || "🍽️"}</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>{f.name}</Text>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.elevated, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textMuted, textTransform: "uppercase" }}>
            Historial de consumo
          </Text>
          {item.logs.length === 0 ? (
            <Text style={{ fontSize: 14, color: c.textMuted }}>Aún no se ha introducido</Text>
          ) : (
            item.logs.map((l) => (
              <View key={l.id} style={{
                backgroundColor: c.surface, borderRadius: 12, padding: 12,
                borderWidth: 1, borderColor: c.elevated,
              }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>
                  {formatDate(l.timestamp)}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  {l.isFirst && (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#F57C00" }}>🥇 Primera vez</Text>
                  )}
                  {l.reaction && (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#E53935" }}>⚠️ {l.reaction}</Text>
                  )}
                </View>
                {l.notes && (
                  <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{l.notes}</Text>
                )}
              </View>
            ))
          )}
        </View>

        {item.firstIntroduced && (
          <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.elevated, alignItems: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Primera introducción</Text>
            <Text style={{ fontSize: 18, fontWeight: "900", color: c.textBody }}>
              {formatDate(item.firstIntroduced)}
            </Text>
          </View>
        )}

        {item.status === "pending" && (
          <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.elevated }}>
            <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 20 }}>
              {item.label} aún no se ha introducido en la alimentación del bebé.
              {"\n\n"}Según la OMS, ESPGHAN y AAP, la introducción temprana de alérgenos ({item.emoji}) puede reducir el riesgo de alergias.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function AllergensScreen() {
  const { data: baby } = useActiveBaby();
  const { data: allergens } = useAllergenTracking(baby?.id);
  const { theme } = useTheme();
  const c = theme.colors;
  const [selected, setSelected] = useState<AllergenInfo | null>(null);

  const summary = useMemo(() => {
    if (!allergens) return { total: 8, introduced: 0, pending: 0, reactions: 0 };
    return {
      total: allergens.length,
      introduced: allergens.filter((a) => a.status === "introduced").length,
      pending: allergens.filter((a) => a.status === "pending").length,
      reactions: allergens.filter((a) => a.status === "reaction").length,
    };
  }, [allergens]);

  if (selected) {
    return <AllergenDetail item={selected} onClose={() => setSelected(null)} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24, color: c.textBody }}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "900", color: c.textBody }}>🥜 Alérgenos</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={{
          backgroundColor: c.card, borderRadius: 16, padding: 20,
          flexDirection: "row", justifyContent: "space-around",
          borderWidth: 1, borderColor: c.elevated,
        }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#4CAF50" }}>{summary.introduced + summary.reactions}</Text>
            <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Introducidos</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#9E9E9E" }}>{summary.pending}</Text>
            <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Pendientes</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#E53935" }}>{summary.reactions}</Text>
            <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Con reacción</Text>
          </View>
        </View>

        {allergens?.map((a) => (
          <AllergenCard key={a.id} item={a} onPress={() => setSelected(a)} />
        ))}

        <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.elevated, gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, textTransform: "uppercase" }}>ℹ️ Acerca de</Text>
          <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
            Los alérgenos se detectan automáticamente a partir de los alimentos registrados en el catálogo OMS. Los alérgenos marcados como "Introducido" aparecen cuando registras al menos un alimento que lo contiene. Basado en recomendaciones OMS, ESPGHAN y AAP (estudio LEAP).
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/resources")}
            style={{ marginTop: 8 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent }}>Ver guía completa de alérgenos →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
