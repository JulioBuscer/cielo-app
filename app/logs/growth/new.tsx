import { useState } from "react";
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
          📏 Nuevo Registro
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        {/* Last measurements summary */}
        {last && (
          <View
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 14,
              flexDirection: "row",
              justifyContent: "space-around",
            }}
          >
            {last.weightGrams != null && (
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text style={{ color: "#888", fontSize: 11, fontWeight: "600" }}>
                  Últ. Peso
                </Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
                  {gramsToKg(last.weightGrams)} kg
                </Text>
              </View>
            )}
            {last.heightMm != null && (
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text style={{ color: "#888", fontSize: 11, fontWeight: "600" }}>
                  Últ. Talla
                </Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
                  {mmToCm(last.heightMm)} cm
                </Text>
              </View>
            )}
            {last.headCircMm != null && (
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text style={{ color: "#888", fontSize: 11, fontWeight: "600" }}>
                  Últ. Cefálico
                </Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
                  {mmToCm(last.headCircMm)} cm
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Weight */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#FFD700", fontWeight: "800", fontSize: 14 }}>
            ⚖️ Peso (kg)
          </Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="0.000"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 14,
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "700",
            }}
          />
        </View>

        {/* Height */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#4CAF50", fontWeight: "800", fontSize: 14 }}>
            📏 Estatura (cm)
          </Text>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="0.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 14,
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "700",
            }}
          />
        </View>

        {/* Head circumference */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#9B59B6", fontWeight: "800", fontSize: 14 }}>
            🌀 C. Cefálica (cm)
          </Text>
          <TextInput
            value={headCircCm}
            onChangeText={setHeadCircCm}
            placeholder="0.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 14,
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "700",
            }}
          />
        </View>

        {/* Notes */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
            📝 Notas
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Opcional"
            placeholderTextColor="#666"
            multiline
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 14,
              color: "#FFFFFF",
              fontSize: 15,
              minHeight: 60,
              textAlignVertical: "top",
            }}
          />
        </View>

        {/* Date & Time */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
            🕐 Fecha y hora
          </Text>
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
