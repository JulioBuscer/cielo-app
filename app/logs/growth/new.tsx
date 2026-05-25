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
  Image,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { captureAndStore, deletePhoto } from "@/src/services/imageStorage";
import { useActiveBaby } from "@/src/hooks/useBaby";
import {
  useSaveGrowthLog,
  useLastGrowthLog,
  gramsToKg,
  mmToCm,
} from "@/src/hooks/useGrowthLogs";
import { useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";

export default function MeasurementNewScreen() {
  const { data: baby } = useActiveBaby();
  const { data: last } = useLastGrowthLog(baby?.id);
  const { theme } = useTheme();
  const c = theme.colors;
  const saveGrowth = useSaveGrowthLog();
  const saveEvent = useSaveTimelineEvent();

  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [headCircCm, setHeadCircCm] = useState("");
  const [notes, setNotes] = useState("");
  const [timestamp, setTimestamp] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  const isValid =
    weightKg.trim() !== "" ||
    heightCm.trim() !== "" ||
    headCircCm.trim() !== "";

  const handleTakePhoto = async () => {
    const uri = await captureAndStore();
    if (uri) setPhotoUris((prev) => [...prev, uri]);
  };

  const handlePickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setPhotoUris((prev) => [...prev, uri]);
  };

  const handleRemovePhoto = async (uri: string) => {
    await deletePhoto(uri);
    setPhotoUris((prev) => prev.filter((u) => u !== uri));
  };

  const handleSave = async () => {
    if (!baby || !isValid) return;
    setSaving(true);
    try {
      const weightVal = weightKg.trim() ? parseFloat(weightKg) : undefined;
      const heightVal = heightCm.trim() ? parseFloat(heightCm) : undefined;
      const headVal = headCircCm.trim() ? parseFloat(headCircCm) : undefined;

      await saveGrowth.mutateAsync({
        babyId: baby.id,
        weightKg: weightVal,
        heightCm: heightVal,
        headCircCm: headVal,
        notes: notes.trim() || undefined,
        timestamp,
      });

      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "measurement",
        timestamp,
        notes: notes.trim() || undefined,
        values: {
          weightKg: weightVal,
          heightCm: heightVal,
          headCircCm: headVal,
          photoUris: photoUris.length > 0 ? photoUris : undefined,
        },
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

      <View className="flex-row items-center px-4 py-3 border-b" style={{ backgroundColor: c.surface, borderBottomColor: c.elevated }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-black" style={{ color: c.textBody }}>
          📏 Nueva Medición
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
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

        <View style={{ gap: 6 }}>
          <Text style={{ color: "#FFD700", fontWeight: "800", fontSize: 14 }}>⚖️ Peso (kg)</Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="0.000"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            className="rounded-xl p-3.5 text-xl font-bold"
            style={{ backgroundColor: c.card, color: c.textBody }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ color: "#4CAF50", fontWeight: "800", fontSize: 14 }}>📏 Estatura (cm)</Text>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="0.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            className="rounded-xl p-3.5 text-xl font-bold"
            style={{ backgroundColor: c.card, color: c.textBody }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ color: "#9B59B6", fontWeight: "800", fontSize: 14 }}>🌀 C. Cefálica (cm)</Text>
          <TextInput
            value={headCircCm}
            onChangeText={setHeadCircCm}
            placeholder="0.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            className="rounded-xl p-3.5 text-xl font-bold"
            style={{ backgroundColor: c.card, color: c.textBody }}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text className="font-bold text-[13px]" style={{ color: c.textMuted }}>📸 Fotos</Text>
          {photoUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {photoUris.map((uri, i) => (
                <View key={i} style={{ position: "relative" }}>
                  <Image
                    source={{ uri }}
                    style={{ width: 80, height: 80, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => handleRemovePhoto(uri)}
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: c.danger,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "900" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={handleTakePhoto}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: c.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                minHeight: 44,
                borderWidth: 1,
                borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 18 }}>📷</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody }}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePickImage}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: c.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                minHeight: 44,
                borderWidth: 1,
                borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 18 }}>🖼️</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody }}>Galería</Text>
            </TouchableOpacity>
          </View>
        </View>

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
