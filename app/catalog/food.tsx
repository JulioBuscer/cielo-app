import { useState, useEffect } from "react";
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
import { getDb } from "@/src/db/client";
import { foodCatalog } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";

const GROUP_EMOJIS: Record<string, string> = {
  fruit: "🍎", vegetable: "🥕", protein: "🥩",
  grain: "🌾", dairy: "🧀", legume: "🫘",
};

const GROUP_LABELS: Record<string, string> = {
  fruit: "Frutas", vegetable: "Verduras", protein: "Proteínas",
  grain: "Cereales", dairy: "Lácteos", legume: "Legumbres",
};

const PROPERTY_LABELS: Record<string, string> = {
  laxative: "Laxante", astringent: "Astringente",
  both: "Ambos", neutral: "Neutro",
};

const PROPERTIES = ["laxative", "astringent", "both", "neutral"] as const;

export default function FoodCatalogScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const qc = useQueryClient();

  const { data: foods } = useQuery({
    queryKey: ["food_catalog_editor"],
    queryFn: () => getDb().select().from(foodCatalog).orderBy(asc(foodCatalog.group), asc(foodCatalog.name)),
  });

  useFocusEffect(() => {
    qc.invalidateQueries({ queryKey: ["food_catalog_editor"] });
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProperty, setEditProperty] = useState<string>("neutral");

  function handleSaveProperty(foodId: string) {
    const db = getDb();
    db.update(foodCatalog)
      .set({ property: editProperty as any })
      .where(eq(foodCatalog.id, foodId))
      .run();
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["food_catalog_editor"] });
  }

  const groups = [...new Set(foods?.map((f) => f.group) ?? [])].sort();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "🥗 Catálogo de alimentos" }} />
      <StatusBar barStyle={parseInt(c.surface.replace("#","").slice(0,2),16) > 128 ? "dark-content" : "light-content"} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
        <Text style={{ fontSize: 13, color: c.textMuted }}>
          Alimentos del catálogo OMS para alimentación complementaria. Puedes editar la propiedad (laxante/astringente) de cada uno.
        </Text>

        {groups.map((group) => (
          <View key={group}>
            <Text style={{
              fontSize: 15, fontWeight: "700", color: c.textBody, marginBottom: 8,
            }}>
              {GROUP_EMOJIS[group] ?? ""} {GROUP_LABELS[group] ?? group}
            </Text>
            <View style={{ gap: 6 }}>
              {(foods ?? []).filter((f) => f.group === group).map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => {
                    setEditingId(f.id);
                    setEditProperty(f.property ?? "neutral");
                  }}
                  style={{
                    flexDirection: "row", alignItems: "center",
                    padding: 12, borderRadius: 12,
                    backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border,
                  }}
                >
                  {editingId === f.id ? (
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: c.textBody }}>
                        {f.emoji ?? ""} {f.name}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {PROPERTIES.map((p) => (
                          <TouchableOpacity
                            key={p}
                            onPress={() => setEditProperty(p)}
                            style={{
                              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                              backgroundColor: editProperty === p ? c.accent : c.elevated,
                            }}
                          >
                            <Text style={{
                              fontSize: 11, fontWeight: "700",
                              color: editProperty === p ? c.textOnAccent : c.textBody,
                            }}>
                              {PROPERTY_LABELS[p]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                        <TouchableOpacity onPress={() => handleSaveProperty(f.id)}>
                          <Text style={{ color: c.accent, fontWeight: "700", fontSize: 13 }}>Guardar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingId(null)}>
                          <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 13 }}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={{ fontSize: 16, flex: 1, color: c.textBody }}>
                        {f.emoji ?? ""} {f.name}
                      </Text>
                      {f.allergens ? (
                        <Text style={{
                          fontSize: 10, fontWeight: "700", color: "#E53935",
                          backgroundColor: "#FFEBEE", paddingHorizontal: 6,
                          paddingVertical: 2, borderRadius: 4, marginRight: 8,
                        }}>
                          ⚠️ {f.allergens}
                        </Text>
                      ) : null}
                      <Text style={{
                        fontSize: 11, fontWeight: "600", color: c.textMuted,
                        backgroundColor: c.elevated, paddingHorizontal: 8,
                        paddingVertical: 3, borderRadius: 6,
                      }}>
                        {PROPERTY_LABELS[f.property ?? "neutral"]}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
