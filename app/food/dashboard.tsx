import { useState, useMemo, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { FoodGridCard } from "@/src/components/food/FoodGridCard";
import { FoodDetailModal } from "@/src/components/food/FoodDetailModal";
import { useActiveBaby, useBabies } from "@/src/hooks/useBaby";
import {
  useFoodCatalog, FOOD_GROUPS, BADGE_FILTERS,
  useBabyFoodConsumed, useBabyFoodWatchlist, useToggleFoodPending,
} from "@/src/hooks/useFoodLogs";
import { useDebounce } from "@/src/hooks/useDebounce";

const GROUP_KEYS = Object.keys(FOOD_GROUPS).sort();

type FilterTab = "all" | "introduced" | "not_introduced" | "pending";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "📋 Todos" },
  { key: "introduced", label: "✅ Introducidos" },
  { key: "not_introduced", label: "⬜ No introducidos" },
  { key: "pending", label: "⏳ Pendientes" },
];

export default function FoodDashboardScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const params = useLocalSearchParams<{ babyId?: string }>();
  const { data: activeBaby } = useActiveBaby();
  const { data: babies } = useBabies();
  const [selectedBabyId, setSelectedBabyId] = useState<string | undefined>(params.babyId ?? activeBaby?.id);
  const baby = babies?.find((b: any) => b.id === selectedBabyId) ?? activeBaby;
  const { data: catalog } = useFoodCatalog();
  const { data: consumed } = useBabyFoodConsumed(baby?.id);
  const { data: pending } = useBabyFoodWatchlist(baby?.id);
  const { mutateAsync: togglePending } = useToggleFoodPending();

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedBadgeFilters, setSelectedBadgeFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [detailFood, setDetailFood] = useState<any>(null);
  const debouncedSearch = useDebounce(searchQuery, 250);

  const toggleBadgeFilter = useCallback((bf: string) => {
    setSelectedBadgeFilters((prev) =>
      prev.includes(bf) ? prev.filter((x) => x !== bf) : [...prev, bf]
    );
  }, []);

  const filtered = useMemo(() => {
    const all = catalog ?? [];
    const q = debouncedSearch.toLowerCase().trim();
    const visible = all.filter((f: any) => !f.hidden);
    return visible.filter((f: any) => {
      if (q && !f.name.toLowerCase().includes(q) && !(f.emoji ?? "").includes(q)) return false;
      if (selectedGroup && f.group !== selectedGroup && !(f.secondaryGroups && f.secondaryGroups.split(",").includes(selectedGroup))) return false;
      if (selectedBadgeFilters.length > 0 && !selectedBadgeFilters.some((bf) => BADGE_FILTERS.find((b) => b.key === bf)?.test(f))) return false;
      const isConsumed = consumed?.has(f.id) ?? false;
      const isPending = pending?.has(f.id) ?? false;
      switch (filterTab) {
        case "introduced": return isConsumed;
        case "not_introduced": return !isConsumed;
        case "pending": return isPending;
        default: return true;
      }
    });
  }, [catalog, debouncedSearch, selectedGroup, selectedBadgeFilters, filterTab, consumed, pending]);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const f of filtered) {
      const g = f.group || "other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }
    return groups;
  }, [filtered]);

  const handlePending = useCallback(async (foodId: string) => {
    if (!baby) return;
    try {
      await togglePending({ babyId: baby.id, foodId });
    } catch {}
  }, [baby, togglePending]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "🥗 Tablero de alimentos" }} />
      <StatusBar barStyle={parseInt(c.surface.replace("#", "").slice(0, 2), 16) > 128 ? "dark-content" : "light-content"} />
      <View style={{
        flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: c.textBody }}>
          🥗 Tablero de alimentos
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {/* Baby selector */}
        {babies && babies.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {babies.map((b: any) => {
              const isSelected = b.id === (baby?.id ?? '');
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

        {/* Filter tabs */}
        <View style={{ flexDirection: "row", gap: 4 }}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilterTab(tab.key)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 10,
                backgroundColor: filterTab === tab.key ? c.accent : c.card,
                alignItems: "center",
              }}
            >
              <Text style={{
                fontSize: 11, fontWeight: "700",
                color: filterTab === tab.key ? c.textOnAccent : c.textBody,
              }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 Buscar alimento…"
          placeholderTextColor={c.textDim}
          style={{
            backgroundColor: c.elevated, color: c.textBody,
            padding: 10, borderRadius: 10, fontSize: 14,
            borderWidth: 1, borderColor: c.border,
          }}
        />

        {/* Group pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
          {GROUP_KEYS.map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => setSelectedGroup(selectedGroup === k ? null : k)}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                backgroundColor: selectedGroup === k ? c.accent : c.card,
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "600",
                color: selectedGroup === k ? c.textOnAccent : c.textBody,
              }}>{FOOD_GROUPS[k]}</Text>
            </TouchableOpacity>
          ))}
          {BADGE_FILTERS.map((bf) => (
            <TouchableOpacity
              key={bf.key}
              onPress={() => toggleBadgeFilter(bf.key)}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                backgroundColor: selectedBadgeFilters.includes(bf.key) ? c.accent : c.card,
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "600",
                color: selectedBadgeFilters.includes(bf.key) ? c.textOnAccent : c.textBody,
              }}>{bf.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Simple/Advanced toggle */}
        <View style={{ flexDirection: "row", backgroundColor: c.card, borderRadius: 10, padding: 2 }}>
          {(["simple", "advanced"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setAdvanced(mode === "advanced")}
              style={{
                flex: 1, paddingVertical: 6, borderRadius: 8,
                backgroundColor: (mode === "advanced") === advanced ? c.accent : "transparent",
                alignItems: "center",
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "700",
                color: (mode === "advanced") === advanced ? c.textOnAccent : c.textMuted,
              }}>
                {mode === "simple" ? "🙂 Simple" : "🔬 Avanzada"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {Object.keys(grouped).length === 0 ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: c.textMuted, fontSize: 14 }}>No hay alimentos</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([group, foods]) => {
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
                    const isPending = pending?.has(f.id) ?? false;
                    return (
                      <View key={f.id} style={{ width: "33.33%", padding: 4 }}>
                        <FoodGridCard
                          food={f}
                          selected={false}
                          consumed={consumed?.has(f.id) ?? false}
                          onPress={() => {
                            const foodId = f.id;
                            handlePending(foodId);
                          }}
                          onLongPress={() => setDetailFood(f)}
                          colors={c}
                          advanced={advanced}
                        />
                        {isPending && (
                          <View style={{
                            position: "absolute", top: 8, left: 8,
                            width: 20, height: 20, borderRadius: 10,
                            backgroundColor: "#FF9800",
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "900" }}>★</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}

        <View style={{
          backgroundColor: c.card, borderRadius: 12, padding: 14,
          borderLeftWidth: 3, borderLeftColor: c.accent,
        }}>
          <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
            💡 Toca un alimento para marcarlo como "pendiente por probar". Los alimentos pendientes aparecen en la pestaña ⏳ Pendientes y se marcan con ★ naranja.
          </Text>
        </View>
      </ScrollView>

      <FoodDetailModal food={detailFood} visible={!!detailFood} onClose={() => setDetailFood(null)} />
    </SafeAreaView>
  );
}
