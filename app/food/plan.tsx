import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, Modal, TextInput, Platform } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { FoodGridCard } from "@/src/components/food/FoodGridCard";
import { useActiveBaby, useBabies } from "@/src/hooks/useBaby";
import {
  useFoodCatalog, FOOD_GROUPS,
  useBabyFoodConsumed,
  useMealPlans, useAddMealPlan, useRemoveMealPlan, getWeekStart, BADGE_FILTERS, SUBGROUPS,
} from "@/src/hooks/useFoodLogs";
import { useDebounce } from "@/src/hooks/useDebounce";

const GROUP_KEYS = Object.keys(FOOD_GROUPS);
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatDate(d: Date): string {
  return `${d.getDate()} ${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][d.getMonth()]} ${d.getFullYear()}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function FoodPlanScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const params = useLocalSearchParams<{ babyId?: string }>();

  const { data: activeBaby } = useActiveBaby();
  const { data: babies } = useBabies();
  const { data: catalog } = useFoodCatalog();
  const { data: consumed } = useBabyFoodConsumed(params.babyId ?? activeBaby?.id);
  const addMeal = useAddMealPlan();
  const removeMeal = useRemoveMealPlan();

  const [selectedBabyId, setSelectedBabyId] = useState<string | undefined>(params.babyId ?? activeBaby?.id);
  const baby = babies?.find((b: any) => b.id === selectedBabyId) ?? activeBaby;

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekStart(base);
  }, [weekOffset]);

  const { data: plans } = useMealPlans(baby?.id, weekStart);

  // ─── Modal grid state ────────────────────────────────────────────────
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [modalGroup, setModalGroup] = useState<string | null>(null);
  const [modalSubgroups, setModalSubgroups] = useState<string[]>([]);
  const [modalBadges, setModalBadges] = useState<string[]>([]);
  const [modalAdvanced, setModalAdvanced] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const debouncedSearch = useDebounce(modalSearch, 250);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (addingDay != null) {
      setModalGroup(null);
      setModalSubgroups([]);
      setModalBadges([]);
      setModalAdvanced(false);
      setModalSearch("");
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [addingDay]);

  const modalGroupFiltered = useMemo(() =>
    catalog?.filter(
      (f: any) => !modalGroup || f.group === modalGroup || (f.secondaryGroups && f.secondaryGroups.split(",").includes(modalGroup))
    ) ?? []
  , [catalog, modalGroup]);

  const modalBadgeFiltered = useMemo(() =>
    modalBadges.length > 0
      ? modalGroupFiltered.filter((f: any) => modalBadges.some((bf) => BADGE_FILTERS.find((b) => b.key === bf)?.test(f)))
      : modalGroupFiltered
  , [modalGroupFiltered, modalBadges]);

  const modalFiltered = useMemo(() =>
    (modalSubgroups.length > 0
      ? modalBadgeFiltered.filter((f: any) => f.subgroup && modalSubgroups.includes(f.subgroup))
      : modalBadgeFiltered)
      .filter((f: any) => {
        if (!debouncedSearch.trim()) return true;
        const q = debouncedSearch.toLowerCase().trim();
        return f.name.toLowerCase().includes(q) || (f.emoji ?? "").includes(q);
      })
  , [modalBadgeFiltered, modalSubgroups, debouncedSearch]);

  const modalAvailableSubgroups = useMemo(() =>
    [...new Set(modalGroupFiltered.map((f: any) => f.subgroup).filter(Boolean))] as string[]
  , [modalGroupFiltered]);

  const toggleModalSubgroup = useCallback((sg: string) => {
    setModalSubgroups((prev) => prev.includes(sg) ? prev.filter((x) => x !== sg) : [...prev, sg]);
  }, []);

  const toggleModalBadge = useCallback((bf: string) => {
    setModalBadges((prev) => prev.includes(bf) ? prev.filter((x) => x !== bf) : [...prev, bf]);
  }, []);

  // ─── Plan logic ──────────────────────────────────────────────────────
  const planByDay = useMemo(() => {
    const byDay: Record<number, typeof plans> = {};
    for (let i = 0; i < 7; i++) byDay[i] = [];
    if (plans) {
      for (const p of plans) {
        const day = p.dayOfWeek;
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(p);
      }
    }
    return byDay;
  }, [plans]);

  const catalogMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (catalog) for (const f of catalog) map[f.id] = f;
    return map;
  }, [catalog]);

  const weekPlanIds = useMemo(() => {
    const ids = new Set<string>();
    if (plans) for (const p of plans) ids.add(p.foodId);
    return ids;
  }, [plans]);

  const validateDay = useCallback((dayIndex: number) => {
    const dayPlans = planByDay[dayIndex] ?? [];
    const covered = new Set<string>();
    for (const p of dayPlans) {
      const food = catalogMap[p.foodId];
      if (food) covered.add(food.group);
    }
    const missing = GROUP_KEYS.filter((g) => !covered.has(g));
    return { covered, missing, count: dayPlans.length };
  }, [planByDay, catalogMap]);

  const handleAddFood = useCallback(async (foodId: string) => {
    if (!baby || addingDay == null) return;
    if (weekPlanIds.has(foodId)) {
      // Already in plan this week → remove from this day
      const existing = plans?.find((p) => p.foodId === foodId && p.dayOfWeek === addingDay);
      if (existing) {
        removeMeal.mutate({ id: existing.id, babyId: baby.id });
        return;
      }
    }
    try {
      await addMeal.mutateAsync({ babyId: baby.id, foodId, weekStart, dayOfWeek: addingDay });
    } catch {}
  }, [baby, addingDay, weekStart, addMeal, removeMeal, plans, weekPlanIds]);

  const handleRemoveFood = useCallback((planId: string) => {
    if (!baby) return;
    Alert.alert("Quitar del plan", "¿Eliminar este alimento del plan semanal?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar", style: "destructive",
        onPress: () => removeMeal.mutate({ id: planId, babyId: baby.id }),
      },
    ]);
  }, [baby, removeMeal]);

  const totalCoverage = useMemo(() => {
    const days = [0, 1, 2, 3, 4, 5, 6];
    const stats = days.map((d) => ({ day: d, ...validateDay(d) }));
    const fullDays = stats.filter((s) => s.missing.length === 0).length;
    return { stats, fullDays };
  }, [validateDay]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "📅 Plan semanal" }} />
      <StatusBar barStyle={parseInt(c.surface.replace("#", "").slice(0, 2), 16) > 128 ? "dark-content" : "light-content"} />
      <View style={{
        flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: c.textBody }}>
          📅 Plan semanal
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {babies && babies.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {babies.map((b: any) => {
              const isSelected = b.id === (baby?.id ?? "");
              return (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => setSelectedBabyId(b.id)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 4,
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
                    backgroundColor: isSelected ? c.accent : c.card,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{b.avatarEmoji ?? "👶"}</Text>
                  <Text style={{
                    fontSize: 13, fontWeight: "700",
                    color: isSelected ? c.textOnAccent : c.textBody,
                  }}>{b.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <TouchableOpacity onPress={() => setWeekOffset((p) => p - 1)} style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 20, color: c.accent }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.textBody }}>
            Semana del {formatDate(weekStart)}
          </Text>
          <TouchableOpacity onPress={() => setWeekOffset((p) => p + 1)} style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 20, color: c.accent }}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={{
          backgroundColor: c.card, borderRadius: 12, padding: 12,
          flexDirection: "row", justifyContent: "space-around",
          borderLeftWidth: 3, borderLeftColor: c.accent,
        }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: c.textBody }}>{totalCoverage.fullDays}/7</Text>
            <Text style={{ fontSize: 11, color: c.textMuted }}>Días completos</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: c.textBody }}>
              {GROUP_KEYS.map((g) => {
                const allCovered = totalCoverage.stats.every((s) => s.covered.has(g));
                return allCovered ? "✅" : "⬜";
              }).join(" ")}
            </Text>
            <Text style={{ fontSize: 11, color: c.textMuted }}>Grupos por día</Text>
          </View>
        </View>

        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
          const dayPlans = planByDay[dayIndex] ?? [];
          const dayDate = addDays(weekStart, dayIndex);
          const today = new Date();
          const isToday = dayDate.toDateString() === today.toDateString();
          const { covered, missing, count } = validateDay(dayIndex);

          return (
            <View key={dayIndex} style={{
              backgroundColor: c.elevated, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: isToday ? c.accent : c.border,
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: c.textBody }}>
                    {DAY_LABELS[dayIndex]}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.textMuted }}>
                    {formatDate(dayDate)}
                  </Text>
                  {isToday && (
                    <View style={{ backgroundColor: c.accent, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: c.textOnAccent }}>HOY</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: c.textMuted }}>
                  {count} alimento{count !== 1 ? "s" : ""}
                </Text>
              </View>

              {count === 0 ? (
                <Text style={{ fontSize: 13, color: c.textDim, fontStyle: "italic", marginBottom: 8 }}>
                  Sin alimentos planeados
                </Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {dayPlans.map((p) => {
                    const food = catalogMap[p.foodId];
                    if (!food) return null;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => handleRemoveFood(p.id)}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 3,
                          backgroundColor: c.card, borderRadius: 8,
                          paddingHorizontal: 8, paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>{food.emoji ?? "🍽️"}</Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: c.textBody }}>{food.name}</Text>
                        <Text style={{ fontSize: 10, color: c.textMuted }}>✕</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                onPress={() => setAddingDay(dayIndex)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 16, color: c.accent }}>＋</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent }}>
                  Agregar alimento
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                {GROUP_KEYS.map((g) => {
                  const has = covered.has(g);
                  return (
                    <View key={g} style={{
                      flexDirection: "row", alignItems: "center", gap: 2,
                      backgroundColor: has ? "#E8F5E9" : "#FFF3E0",
                      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 10 }}>{has ? "✅" : "⬜"}</Text>
                      <Text style={{
                        fontSize: 10, fontWeight: "600",
                        color: has ? "#2E7D32" : "#E65100",
                      }}>{FOOD_GROUPS[g].split(" ").slice(1).join(" ")}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{
          backgroundColor: c.card, borderRadius: 12, padding: 14,
          borderLeftWidth: 3, borderLeftColor: c.accent,
        }}>
          <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
            💡 Toca un alimento para quitarlo del plan. Usa las flechas ◀ ▶ para cambiar de semana. El objetivo es cubrir al menos un alimento de cada grupo por día.
          </Text>
        </View>
      </ScrollView>

      {/* ─── Grid-based food selection modal ───────────────────────────── */}
      <Modal visible={addingDay != null} transparent animationType="slide" onRequestClose={() => setAddingDay(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAddingDay(null)} />
          <View style={{
            backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: "80%", paddingBottom: Platform.OS === "ios" ? 20 : 8,
          }}>
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 0 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text style={{ fontSize: 36 }}>🍽️</Text>
                <Text style={{ color: c.textBody, fontSize: 18, fontWeight: "800" }}>
                  {addingDay != null ? `${DAY_LABELS[addingDay]} ${formatDate(addDays(weekStart, addingDay))}` : ""}
                </Text>
              </View>

              <TextInput
                ref={searchRef}
                value={modalSearch}
                onChangeText={setModalSearch}
                placeholder="🔍 Buscar alimento…"
                placeholderTextColor={c.textDim}
                style={{
                  backgroundColor: c.elevated, color: c.textBody,
                  padding: 10, borderRadius: 10, fontSize: 14,
                  borderWidth: 1, borderColor: c.border,
                }}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {GROUP_KEYS.map((k) => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setModalGroup(modalGroup === k ? null : k)}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                      backgroundColor: modalGroup === k ? c.accent : c.card,
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: "600",
                      color: modalGroup === k ? c.textOnAccent : c.textBody,
                    }}>{FOOD_GROUPS[k]}</Text>
                  </TouchableOpacity>
                ))}
                {BADGE_FILTERS.map((bf) => (
                  <TouchableOpacity
                    key={bf.key}
                    onPress={() => toggleModalBadge(bf.key)}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                      backgroundColor: modalBadges.includes(bf.key) ? c.accent : c.card,
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: "600",
                      color: modalBadges.includes(bf.key) ? c.textOnAccent : c.textBody,
                    }}>{bf.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {modalAvailableSubgroups.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                  {modalAvailableSubgroups.map((sg) => (
                    <TouchableOpacity
                      key={sg}
                      onPress={() => toggleModalSubgroup(sg)}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                        backgroundColor: modalSubgroups.includes(sg) ? c.accent : c.card,
                      }}
                    >
                      <Text style={{
                        fontSize: 12, fontWeight: "600",
                        color: modalSubgroups.includes(sg) ? c.textOnAccent : c.textBody,
                      }}>{SUBGROUPS[sg] ?? sg}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={{ flexDirection: "row", backgroundColor: c.card, borderRadius: 10, padding: 2 }}>
                {(["simple", "advanced"] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setModalAdvanced(mode === "advanced")}
                    style={{
                      flex: 1, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: (mode === "advanced") === modalAdvanced ? c.accent : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: "700",
                      color: (mode === "advanced") === modalAdvanced ? c.textOnAccent : c.textMuted,
                    }}>
                      {mode === "simple" ? "🙂 Simple" : "🔬 Avanzada"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {modalFiltered.length === 0 ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <Text style={{ color: c.textMuted, fontSize: 14 }}>No hay alimentos</Text>
                </View>
              ) : (
                (() => {
                  const grouped: Record<string, typeof modalFiltered> = {};
                  for (const f of modalFiltered) {
                    const g = f.group || "other";
                    if (!grouped[g]) grouped[g] = [];
                    grouped[g].push(f);
                  }
                  return Object.entries(grouped).map(([group, foods]) => {
                    const grpLabel = (FOOD_GROUPS as any)[group] ?? group;
                    const emoji = grpLabel.split(" ")[0];
                    const label = grpLabel.split(" ").slice(1).join(" ");
                    return (
                      <View key={group}>
                        <Text style={{
                          fontSize: 13, fontWeight: "700", color: c.textBody, marginBottom: 4,
                        }}>
                          {emoji} {label}
                          <Text style={{ color: c.textMuted, fontWeight: "400" }}> ({foods.length})</Text>
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
                          {foods.map((f: any) => {
                            const alreadyPlanned = weekPlanIds.has(f.id);
                            return (
                              <View key={f.id} style={{ width: "33.33%", padding: 4 }}>
                                <FoodGridCard
                                  food={f}
                                  selected={alreadyPlanned && (plans?.some((p) => p.foodId === f.id && p.dayOfWeek === addingDay) ?? false)}
                                  consumed={consumed?.has(f.id) ?? false}
                                  onPress={() => handleAddFood(f.id)}
                                  onLongPress={() => {}}
                                  colors={c}
                                  advanced={modalAdvanced}
                                />
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  });
                })()
              )}

              <View style={{ paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, color: c.textMuted, textAlign: "center", lineHeight: 16 }}>
                  💡 Toca un alimento para agregarlo al plan. Si ya está en otro día, se moverá al día seleccionado. Los alimentos ya planeados esta semana se muestran seleccionados.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
