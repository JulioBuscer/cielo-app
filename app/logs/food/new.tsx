import { useState } from "react";
import { useTheme } from "@/src/theme/useTheme";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useFoodCatalog, useSaveFoodLog } from "@/src/hooks/useFoodLogs";
import { useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";

const GROUP_EMOJIS: Record<string, string> = {
  fruit: "🍎", vegetable: "🥕", protein: "🥩",
  grain: "🌾", dairy: "🧀", legume: "🫘",
};

export default function FoodLogNewScreen() {
  const { data: baby } = useActiveBaby();
  const { data: catalog } = useFoodCatalog();
  const saveFood = useSaveFoodLog();
  const saveEvent = useSaveTimelineEvent();
  const { theme } = useTheme();
  const c = theme.colors;

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState(new Date());
  const [isFirst, setIsFirst] = useState(false);
  const [reaction, setReaction] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const groups = [...new Set(catalog?.map((f) => f.group) ?? [])].sort();
  const filtered =
    catalog?.filter(
      (f) => !selectedGroup || f.group === selectedGroup
    ) ?? [];

  async function handleSave() {
    if (!baby || !selectedFoodId) {
      Alert.alert("Selecciona un alimento");
      return;
    }
    setSaving(true);
    try {
      await saveFood.mutateAsync({
        babyId: baby.id,
        foodId: selectedFoodId,
        timestamp,
        isFirst,
        reaction: reaction || undefined,
        notes: notes || undefined,
      });
      const food = catalog?.find((f) => f.id === selectedFoodId);
      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "note",
        timestamp,
        notes: `🍽️ ${food?.emoji ?? ""} ${food?.name ?? ""}${isFirst ? " (primera vez)" : ""}${reaction ? ` — ${reaction}` : ""}`,
      });
      router.back();
    } catch {
      Alert.alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "🍽️ Alimentación complementaria" }} />
      <StatusBar barStyle={parseInt(c.surface.replace("#","").slice(0,2),16) > 128 ? "dark-content" : "light-content"} />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        style={{ flex: 1 }}
      >
        <Text style={{ fontSize: 13, color: c.textMuted }}>
          ¿Qué comió hoy {baby?.name ?? ""}?
        </Text>

        <View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginBottom: 8 }}>
            Grupo
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedGroup(null)}
              style={{
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                backgroundColor: !selectedGroup ? c.accent : c.elevated,
              }}
            >
              <Text style={{
                fontSize: 14, fontWeight: "600",
                color: !selectedGroup ? c.textOnAccent : c.textBody,
              }}>Todos</Text>
            </TouchableOpacity>
            {groups.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setSelectedGroup(g)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                  backgroundColor: selectedGroup === g ? c.accent : c.elevated,
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: "600",
                  color: selectedGroup === g ? c.textOnAccent : c.textBody,
                }}>
                  {GROUP_EMOJIS[g] ?? ""} {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginBottom: 8 }}>
            Alimento
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filtered.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setSelectedFoodId(f.id)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: selectedFoodId === f.id ? c.accent : c.elevated,
                  borderWidth: 1,
                  borderColor: selectedFoodId === f.id ? c.accent : c.border,
                }}
              >
                <Text style={{
                  fontSize: 15,
                  color: selectedFoodId === f.id ? c.textOnAccent : c.textBody,
                }}>
                  {f.emoji ?? ""} {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <DateTimePicker value={timestamp} onChange={setTimestamp} />

        <TouchableOpacity
          onPress={() => setIsFirst(!isFirst)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <View style={{
            width: 24, height: 24, borderRadius: 4, borderWidth: 2,
            borderColor: c.accent,
            backgroundColor: isFirst ? c.accent : "transparent",
            alignItems: "center", justifyContent: "center",
          }}>
            {isFirst && <Text style={{ color: c.textOnAccent, fontSize: 14 }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 15, color: c.textBody }}>🥇 Primera vez que prueba este alimento</Text>
        </TouchableOpacity>

        <View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginBottom: 8 }}>
            Reacción (opcional)
          </Text>
          <TextInput
            value={reaction}
            onChangeText={setReaction}
            placeholder="Ej: le gustó mucho, hizo gesto, etc."
            placeholderTextColor={c.textDim}
            style={{
              backgroundColor: c.elevated, color: c.textBody,
              padding: 14, borderRadius: 12, fontSize: 15,
              borderWidth: 1, borderColor: c.border,
            }}
          />
        </View>

        <View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginBottom: 8 }}>
            Notas (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Textura, cantidad, etc."
            placeholderTextColor={c.textDim}
            multiline
            style={{
              backgroundColor: c.elevated, color: c.textBody,
              padding: 14, borderRadius: 12, fontSize: 15, minHeight: 80,
              borderWidth: 1, borderColor: c.border,
            }}
          />
        </View>

        <BigButton
          title={saving ? "Guardando…" : "Guardar"}
          onPress={handleSave}
          disabled={saving || !selectedFoodId}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
