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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import {
  useSaveGrowthLog,
  useLastGrowthLog,
  gramsToKg,
  mmToCm,
} from "@/src/hooks/useGrowthLogs";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";

export default function GrowthNewScreen() {
  const { data: baby } = useActiveBaby();
  const { data: last } = useLastGrowthLog(baby?.id);
  const { theme } = useTheme();
  const c = theme.colors;
  const saveGrowth = useSaveGrowthLog();

  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [headCircCm, setHeadCircCm] = useState("");
  const [notes, setNotes] = useState("");
  const [timestamp, setTimestamp] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const isValid =
    weightKg.trim() !== "" ||
    heightCm.trim() !== "" ||
    headCircCm.trim() !== "";

  const handleSave = async () => {
    if (!baby || !isValid) return;
    setSaving(true);
    try {
      await saveGrowth.mutateAsync({
        babyId: baby.id,
        weightKg: weightKg.trim() ? parseFloat(weightKg) : undefined,
        heightCm: heightCm.trim() ? parseFloat(heightCm) : undefined,
        headCircCm: headCircCm.trim() ? parseFloat(headCircCm) : undefined,
        notes: notes.trim() || undefined,
        timestamp,
      });
      router.back();
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar el registro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: c.surface, borderBottomColor: c.elevated }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-black" style={{ color: c.textBody }}>
          📏 Nuevo Registro
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
        {/* Last measurements summary */}
        {last && (
          <View className="rounded-xl p-3.5 flex-row justify-around" style={{ backgroundColor: c.card }}>
            {last.weightGrams != null && (
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text className="text-[11px] font-semibold" style={{ color: c.textDim }}>Últ. Peso</Text>
                <Text className="font-black text-base" style={{ color: c.textBody }}>{gramsToKg(last.weightGrams)} kg</Text>
              </View>
            )}
            {last.heightMm != null && (
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text className="text-[11px] font-semibold" style={{ color: c.textDim }}>Últ. Talla</Text>
                <Text className="font-black text-base" style={{ color: c.textBody }}>{mmToCm(last.heightMm)} cm</Text>
              </View>
            )}
            {last.headCircMm != null && (
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text className="text-[11px] font-semibold" style={{ color: c.textDim }}>Últ. Cefálico</Text>
                <Text className="font-black text-base" style={{ color: c.textBody }}>{mmToCm(last.headCircMm)} cm</Text>
              </View>
            )}
          </View>
        )}

        {/* Weight */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#FFD700", fontWeight: "800", fontSize: 14 }}>⚖️ Peso (kg)</Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="0.000"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            className="rounded-xl p-3.5 text-xl font-bold" style={{ backgroundColor: c.card, color: c.textBody }}
          />
        </View>

        {/* Height */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#4CAF50", fontWeight: "800", fontSize: 14 }}>📏 Estatura (cm)</Text>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="0.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            className="rounded-xl p-3.5 text-xl font-bold" style={{ backgroundColor: c.card, color: c.textBody }}
          />
        </View>

        {/* Head circumference */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#9B59B6", fontWeight: "800", fontSize: 14 }}>🌀 C. Cefálica (cm)</Text>
          <TextInput
            value={headCircCm}
            onChangeText={setHeadCircCm}
            placeholder="0.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            className="rounded-xl p-3.5 text-xl font-bold" style={{ backgroundColor: c.card, color: c.textBody }}
          />
        </View>

        {/* Notes */}
        <View style={{ gap: 6 }}>
          <Text className="font-bold text-[13px]" style={{ color: c.textMuted }}>📝 Notas</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Opcional"
            placeholderTextColor="#666"
            multiline
            className="rounded-xl p-3.5 text-[15px]"
            style={{ backgroundColor: c.card, color: c.textBody, minHeight: 60, textAlignVertical: "top" }}
          />
        </View>

        {/* Date & Time */}
        <View style={{ gap: 6 }}>
          <Text className="font-bold text-[13px]" style={{ color: c.textMuted }}>🕐 Fecha y hora</Text>
          <DateTimePicker value={timestamp} onChange={setTimestamp} />
        </View>

        <BigButton
          title={saving ? "Guardando..." : "💾 Guardar"}
          onPress={handleSave}
          disabled={saving || !isValid}
          variant="primary"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
