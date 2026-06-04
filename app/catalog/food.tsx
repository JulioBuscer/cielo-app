import { useState, useMemo } from "react";
import { useTheme } from "@/src/theme/useTheme";
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, TextInput, Alert,
} from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useFoodCatalogAll, useUpdateFoodCatalog, useDeleteFoodCatalog, SUBGROUPS } from "@/src/hooks/useFoodLogs";
import { FoodDetailModal } from "@/src/components/food/FoodDetailModal";

const GROUP_EMOJIS: Record<string, string> = {
  fruit: "🍎", vegetable: "🥕", grain: "🌾",
  protein: "🥩", fat: "🥑",
};

const GROUP_LABELS: Record<string, string> = {
  fruit: "🍎 Frutas", vegetable: "🥕 Verduras", grain: "🌾 Cereales",
  protein: "🥩 Proteína", fat: "🥑 Grasas",
};

const GROUP_KEYS = Object.keys(GROUP_LABELS);

const SUBGROUP_KEYS = Object.keys(SUBGROUPS);

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
  const { mutate: updateFood } = useUpdateFoodCatalog();
  const { mutateAsync: deleteFood } = useDeleteFoodCatalog();

  const { data: foods } = useFoodCatalogAll();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [editProperty, setEditProperty] = useState("neutral");
  const [editEffect, setEditEffect] = useState<string | null>(null);
  const [editIsAllergen, setEditIsAllergen] = useState(false);
  const [editAllergenDetails, setEditAllergenDetails] = useState("");
  const [editWarning, setEditWarning] = useState("");
  const [editWarningType, setEditWarningType] = useState<string>("");
  const [editAllergens, setEditAllergens] = useState<string[]>([]);
  const [editSecondaryGroups, setEditSecondaryGroups] = useState<string>("");
  const [editSubgroup, setEditSubgroup] = useState<string>("");
  const [detailFood, setDetailFood] = useState<any>(null);

  function startEditing(f: any) {
    setEditingId(f.id);
    setEditName(f.name);
    setEditEmoji(f.emoji ?? "");
    setEditGroup(f.group);
    setEditProperty(f.property ?? "neutral");
    setEditEffect(f.effect ?? null);
    setEditIsAllergen(f.isAllergen ?? false);
    setEditAllergenDetails(f.allergenDetails ?? "");
    setEditWarning(f.warning ?? "");
    setEditWarningType(f.warningType ?? "");
    const raw: string = f.allergens ?? "";
    setEditAllergens(raw ? raw.split(",").map((a: string) => a.trim()).filter(Boolean) : []);
    setEditSecondaryGroups(f.secondaryGroups ?? "");
    setEditSubgroup(f.subgroup ?? "");
  }

  function handleSave() {
    if (!editingId) return;
    updateFood({
      id: editingId,
      name: editName.trim(),
      emoji: editEmoji,
      group: editGroup,
      property: editProperty,
      allergens: editAllergens,
      effect: editEffect,
      isAllergen: editIsAllergen,
      allergenDetails: editAllergenDetails || null,
      warning: editWarning || null,
      warningType: editWarningType || null,
      secondaryGroups: editSecondaryGroups || null,
      subgroup: editSubgroup || null,
    });
    setEditingId(null);
  }

  async function handleDeleteOrHide() {
    if (!editingId) return;
    const food = foods?.find((f: any) => f.id === editingId);
    if (!food) return;
    const name = food.name ?? editingId;
    try {
      const result = await deleteFood({ id: editingId });
      setEditingId(null);
      if (result === "hidden") {
        Alert.alert("Ocultado", `"${name}" se ocultó del selector.`);
      } else {
        Alert.alert("Eliminado", `"${name}" se eliminó permanentemente.`);
      }
    } catch {
      Alert.alert("Error", "No se pudo verificar el alimento");
    }
  }

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const hiddenCount = foods?.filter((f: any) => f.hidden).length ?? 0;
  const visible = foods?.filter((f: any) => !f.hidden) ?? [];
  const groups = [...new Set(visible.map((f: any) => f.group))].sort();

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

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
            Toca un alimento para editarlo. Los cambios se reflejan en todo el historial. Si el alimento no tiene registros se elimina físicamente; si ya tiene, se oculta del selector.
          </Text>
          {hiddenCount > 0 && (
            <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 6 }}>
              🙈 {hiddenCount} alimento(s) oculto(s) — se muestran abajo pero no aparecen en el selector de comidas.
            </Text>
          )}
        </View>

        {groups.map((group) => {
          const isCollapsed = collapsedGroups[group] ?? false;
          const groupFoods = (foods ?? []).filter((f) => f.group === group);
          return (
          <View key={group}>
            <TouchableOpacity
              onPress={() => toggleGroup(group)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                marginBottom: 8,
              }}
            >
              <Text style={{
                fontSize: 14, color: c.textMuted,
              }}>
                {isCollapsed ? "▶" : "▼"}
              </Text>
              <Text style={{
                fontSize: 15, fontWeight: "700", color: c.textBody,
              }}>
                {GROUP_EMOJIS[group] ?? ""} {GROUP_LABELS[group] ?? group}
              </Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>
                ({groupFoods.length})
              </Text>
            </TouchableOpacity>
            {!isCollapsed && (
            <View style={{ gap: 6 }}>
              {groupFoods.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => startEditing(f)}
                  onLongPress={() => setDetailFood(f)}
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
                              }}>                          {PROPERTY_LABELS[p]}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Efecto (guía)</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                          {[null, "laxative", "astringent", "regulator"].map((e) => {
                            const label = e === null ? "—" : e === "laxative" ? "🟢 Lax" : e === "astringent" ? "🟤 Astr" : "🔄 Reg";
                            return (
                              <TouchableOpacity
                                key={e ?? "null"}
                                onPress={() => setEditEffect(e)}
                                style={{
                                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                                  backgroundColor: editEffect === e ? c.accent : c.card,
                                }}
                              >
                                <Text style={{
                                  fontSize: 11, fontWeight: "700",
                                  color: editEffect === e ? c.textOnAccent : c.textBody,
                                }}>{label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => setEditIsAllergen(!editIsAllergen)}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 8,
                          paddingVertical: 6,
                        }}
                      >
                        <View style={{
                          width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                          borderColor: c.accent,
                          backgroundColor: editIsAllergen ? c.accent : "transparent",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {editIsAllergen && <Text style={{ color: c.textOnAccent, fontSize: 10 }}>✓</Text>}
                        </View>
                        <Text style={{ fontSize: 13, color: c.textBody }}>🚨 Alérgeno mayor</Text>
                      </TouchableOpacity>
                      {editIsAllergen && (
                        <TextInput
                          value={editAllergenDetails}
                          onChangeText={setEditAllergenDetails}
                          placeholder="Detalles del alérgeno"
                          placeholderTextColor={c.textDim}
                          style={{
                            backgroundColor: c.card, borderRadius: 8, padding: 8,
                            color: c.textBody, fontSize: 12,
                          }}
                        />
                      )}
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>⚠️ Alerta / Advertencia</Text>
                        <TextInput
                          value={editWarning}
                          onChangeText={setEditWarning}
                          placeholder="Ej: Limitar porción antes de 12 meses"
                          placeholderTextColor={c.textDim}
                          style={{
                            backgroundColor: c.card, borderRadius: 8, padding: 8,
                            color: c.textBody, fontSize: 12,
                          }}
                        />
                        {editWarning ? (
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {[["", "—"], ["nitrates", "🥬 Nitratos"], ["choking", "⚠️ Asfixia"], ["vitamin_a", "💊 Vit A"], ["paste", "🥜 Pasta"], ["age_restriction", "🔞 Edad"]].map(([val, label]) => (
                              <TouchableOpacity
                                key={val}
                                onPress={() => setEditWarningType(val)}
                                style={{
                                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                                  backgroundColor: editWarningType === val ? c.accent : c.card,
                                }}
                              >
                                <Text style={{
                                  fontSize: 10, fontWeight: "700",
                                  color: editWarningType === val ? c.textOnAccent : c.textBody,
                                }}>{label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : null}
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

                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Grupos secundarios</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                          {GROUP_KEYS.filter((k) => k !== editGroup).map((k) => {
                            const selected = editSecondaryGroups.split(",").includes(k);
                            return (
                              <TouchableOpacity
                                key={k}
                                onPress={() => {
                                  const current = editSecondaryGroups ? editSecondaryGroups.split(",").filter(Boolean) : [];
                                  const updated = selected
                                    ? current.filter((x: string) => x !== k)
                                    : [...current, k];
                                  setEditSecondaryGroups(updated.join(","));
                                }}
                                style={{
                                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                                  backgroundColor: selected ? c.accent : c.card,
                                }}
                              >
                                <Text style={{
                                  fontSize: 11, fontWeight: "700",
                                  color: selected ? c.textOnAccent : c.textBody,
                                }}>{GROUP_LABELS[k]}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        {editSecondaryGroups ? (
                          <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>
                            Aparecerá también en: {editSecondaryGroups.split(",").map((g) => GROUP_LABELS[g] || g).join(", ")}
                          </Text>
                        ) : null}
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Subgrupo</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                          <TouchableOpacity
                            onPress={() => setEditSubgroup("")}
                            style={{
                              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                              backgroundColor: !editSubgroup ? c.accent : c.card,
                            }}
                          >
                            <Text style={{
                              fontSize: 11, fontWeight: "700",
                              color: !editSubgroup ? c.textOnAccent : c.textBody,
                            }}>—</Text>
                          </TouchableOpacity>
                          {SUBGROUP_KEYS.map((k) => (
                            <TouchableOpacity
                              key={k}
                              onPress={() => setEditSubgroup(k)}
                              style={{
                                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                                backgroundColor: editSubgroup === k ? c.accent : c.card,
                              }}
                            >
                              <Text style={{
                                fontSize: 11, fontWeight: "700",
                                color: editSubgroup === k ? c.textOnAccent : c.textBody,
                              }}>{SUBGROUPS[k]}</Text>
                            </TouchableOpacity>
                          ))}
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
                        <TouchableOpacity onPress={handleDeleteOrHide}
                          style={{
                            paddingHorizontal: 12, borderRadius: 8,
                            backgroundColor: "#FFEBEE", justifyContent: "center",
                          }}>
                          <Text style={{ color: "#E53935", fontWeight: "900", fontSize: 13 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ fontSize: 16, flex: 1, color: c.textBody, opacity: f.hidden ? 0.4 : 1 }}>
                          {f.emoji ?? ""} {f.name}
                        </Text>
                        {f.hidden ? (
                          <Text style={{
                            fontSize: 10, fontWeight: "700", color: c.textMuted,
                            backgroundColor: c.card, paddingHorizontal: 6,
                            paddingVertical: 2, borderRadius: 4, marginRight: 8,
                          }}>
                            🙈 Oculto
                          </Text>
                        ) : null}
                        {f.isAllergen ? (
                          <Text style={{
                            fontSize: 10, fontWeight: "700", color: "#E53935",
                            backgroundColor: "#FFEBEE", paddingHorizontal: 6,
                            paddingVertical: 2, borderRadius: 4, marginRight: 8,
                          }}>
                            🚨 Alérgeno
                          </Text>
                        ) : null}
                        {f.effect === "laxative" && (
                          <Text style={{
                            fontSize: 10, fontWeight: "700", color: "#2E7D32",
                            backgroundColor: "#E8F5E9", paddingHorizontal: 6,
                            paddingVertical: 2, borderRadius: 4, marginRight: 4,
                          }}>
                            🟢 Lax
                          </Text>
                        )}
                        {f.effect === "astringent" && (
                          <Text style={{
                            fontSize: 10, fontWeight: "700", color: "#5D4037",
                            backgroundColor: "#EFEBE9", paddingHorizontal: 6,
                            paddingVertical: 2, borderRadius: 4, marginRight: 4,
                          }}>
                            🟤 Astr
                          </Text>
                        )}
                        {f.effect === "regulator" && (
                          <Text style={{
                            fontSize: 10, fontWeight: "700", color: "#1565C0",
                            backgroundColor: "#E3F2FD", paddingHorizontal: 6,
                            paddingVertical: 2, borderRadius: 4, marginRight: 4,
                          }}>
                            🔄 Reg
                          </Text>
                        )}
                        <Text style={{
                          fontSize: 11, fontWeight: "600", color: c.textMuted,
                          backgroundColor: c.elevated, paddingHorizontal: 8,
                          paddingVertical: 3, borderRadius: 6,
                        }}>
                          {PROPERTY_LABELS[f.property ?? "neutral"]}
                        </Text>
                        {f.subgroup ? (
                          <Text style={{
                            fontSize: 10, fontWeight: "600", color: c.textMuted,
                            backgroundColor: c.card, paddingHorizontal: 6,
                            paddingVertical: 2, borderRadius: 4,
                          }}>
                            {SUBGROUPS[f.subgroup] ?? f.subgroup}
                          </Text>
                        ) : null}
                        {f.secondaryGroups ? (
                          <Text style={{
                            fontSize: 10, fontWeight: "600", color: c.accent,
                            backgroundColor: c.card, paddingHorizontal: 6,
                            paddingVertical: 2, borderRadius: 4,
                          }}>
                            +{f.secondaryGroups.split(",").length}
                          </Text>
                        ) : null}
                      </View>
                      {f.warning && (
                        <View style={{ flexDirection: "row", marginTop: 4 }}>
                          <Text style={{
                            fontSize: 10, fontWeight: "600", color: "#E65100",
                            backgroundColor: "#FFF3E0", paddingHorizontal: 6,
                            paddingVertical: 2, borderRadius: 4, flex: 1,
                          }}>
                            ⚠️ {f.warning}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            )}
          </View>
          );
        })}
      </ScrollView>
      <FoodDetailModal food={detailFood} visible={!!detailFood} onClose={() => setDetailFood(null)} />
    </SafeAreaView>
  );
}
