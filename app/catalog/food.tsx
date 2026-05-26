import { useState } from "react";
import { useTheme } from "@/src/theme/useTheme";
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, TextInput, Alert,
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

const GROUP_KEYS = Object.keys(GROUP_LABELS);

const PROPERTY_LABELS: Record<string, string> = {
  laxative: "Laxante", astringent: "Astringente",
  both: "Ambos", neutral: "Neutro",
};

const PROPERTIES = ["laxative", "astringent", "both", "neutral"] as const;

const ALLERGEN_LIST = [
  { id: "egg", label: "Huevo", emoji: "🥚" },
  { id: "milk", label: "Leche", emoji: "🥛" },
  { id: "peanut", label: "Cacahuate", emoji: "🥜" },
  { id: "tree_nuts", label: "Frutos secos", emoji: "🌰" },
  { id: "fish", label: "Pescado", emoji: "🐟" },
  { id: "shellfish", label: "Mariscos", emoji: "🦐" },
  { id: "wheat", label: "Trigo", emoji: "🌾" },
  { id: "soy", label: "Soya", emoji: "🫘" },
];

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
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [editProperty, setEditProperty] = useState("neutral");
  const [editAllergens, setEditAllergens] = useState<string[]>([]);

  function startEditing(f: any) {
    setEditingId(f.id);
    setEditName(f.name);
    setEditEmoji(f.emoji ?? "");
    setEditGroup(f.group);
    setEditProperty(f.property ?? "neutral");
    const raw: string = f.allergens ?? "";
    setEditAllergens(raw ? raw.split(",").map((a: string) => a.trim()).filter(Boolean) : []);
  }

  function handleSave() {
    if (!editingId) return;
    const db = getDb();
    db.update(foodCatalog)
      .set({
        name: editName.trim(),
        emoji: editEmoji || null,
        group: editGroup as any,
        property: editProperty as any,
        allergens: editAllergens.length > 0 ? editAllergens.join(",") : null,
      })
      .where(eq(foodCatalog.id, editingId))
      .run();
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["food_catalog_editor"] });
  }

  const groups = [...new Set(foods?.map((f) => f.group) ?? [])].sort();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "🥗 Catálogo de alimentos" }} />
      <StatusBar barStyle={parseInt(c.surface.replace("#","").slice(0,2),16) > 128 ? "dark-content" : "light-content"} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{
          backgroundColor: c.card, borderRadius: 12, padding: 14,
          borderLeftWidth: 3, borderLeftColor: c.accent,
        }}>
          <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
            Toca un alimento para editarlo. Los cambios se reflejan en todo el historial (pasado y futuro). No se puede eliminar un alimento que ya tiene registros.
          </Text>
        </View>

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
                  onPress={() => startEditing(f)}
                  style={{
                    padding: 12, borderRadius: 12,
                    backgroundColor: c.elevated, borderWidth: 1, borderColor: editingId === f.id ? c.accent : c.border,
                  }}
                >
                  {editingId === f.id ? (
                    <View style={{ gap: 12 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TextInput
                          value={editEmoji}
                          onChangeText={setEditEmoji}
                          style={{
                            width: 44, height: 44, textAlign: "center",
                            backgroundColor: c.card, borderRadius: 10, fontSize: 20,
                          }}
                        />
                        <TextInput
                          value={editName}
                          onChangeText={setEditName}
                          style={{
                            flex: 1, backgroundColor: c.card, color: c.textBody,
                            padding: 10, borderRadius: 10, fontSize: 15, fontWeight: "600",
                          }}
                        />
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Grupo</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                          {GROUP_KEYS.map((k) => (
                            <TouchableOpacity
                              key={k}
                              onPress={() => setEditGroup(k)}
                              style={{
                                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                                backgroundColor: editGroup === k ? c.accent : c.card,
                              }}
                            >
                              <Text style={{
                                fontSize: 11, fontWeight: "700",
                                color: editGroup === k ? c.textOnAccent : c.textBody,
                              }}>{GROUP_LABELS[k]}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Propiedad</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                          {PROPERTIES.map((p) => (
                            <TouchableOpacity
                              key={p}
                              onPress={() => setEditProperty(p)}
                              style={{
                                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                                backgroundColor: editProperty === p ? c.accent : c.card,
                              }}
                            >
                              <Text style={{
                                fontSize: 11, fontWeight: "700",
                                color: editProperty === p ? c.textOnAccent : c.textBody,
                              }}>{PROPERTY_LABELS[p]}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Alérgenos</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                          {ALLERGEN_LIST.map((a) => {
                            const selected = editAllergens.includes(a.id);
                            return (
                              <TouchableOpacity
                                key={a.id}
                                onPress={() => setEditAllergens((prev) =>
                                  prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                                )}
                                style={{
                                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                                  backgroundColor: selected ? c.accent : c.card,
                                }}
                              >
                                <Text style={{
                                  fontSize: 11, fontWeight: "700",
                                  color: selected ? c.textOnAccent : c.textBody,
                                }}>{a.emoji} {a.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity onPress={handleSave}
                          style={{
                            flex: 1, backgroundColor: c.accent, borderRadius: 8,
                            paddingVertical: 10, alignItems: "center",
                          }}>
                          <Text style={{ color: c.textOnAccent, fontWeight: "900", fontSize: 13 }}>Guardar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingId(null)}
                          style={{
                            paddingHorizontal: 16, borderRadius: 8,
                            backgroundColor: c.card, justifyContent: "center",
                          }}>
                          <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 13 }}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                    </View>
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
