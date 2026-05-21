import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import {
  useActiveFeedingSession,
  usePauseFeeding,
} from "@/src/hooks/useFeedingSessions";
import { useDiaperObservations, useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { PoopOMeter } from "@/src/components/ui/PoopOMeter";
import { BigButton } from "@/src/components/ui/BigButton";
import { useCamera } from "@/src/hooks/useCamera";
import { useQueryClient } from "@tanstack/react-query";

export default function DiaperNewScreen() {
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: activeFeeding } = useActiveFeedingSession(baby?.id);
  const { data: observations } = useDiaperObservations();
  const pauseFeeding = usePauseFeeding();
  const saveEvent = useSaveTimelineEvent();
  const { pickImage, takePhoto } = useCamera();
  const qc = useQueryClient();

  const [peeIntensity, setPeeIntensity] = useState(0);
  const [poopIntensity, setPoopIntensity] = useState(0);
  const [selectedObs, setSelectedObs] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleObs = (id: string) => {
    setSelectedObs((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!baby || !profile) return;
    setSaving(true);
    try {
      if (activeFeeding && activeFeeding.status === "active") {
        await pauseFeeding.mutateAsync(activeFeeding);
      }

      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "diaper",
        feedingSessionId: activeFeeding?.id,
        metadata: {
          peeIntensity,
          poopIntensity,
          observationIds: selectedObs,
          imageUri: imageUri ?? undefined,
        },
      });

      qc.invalidateQueries({ queryKey: ["timeline"] });
      router.back();
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar el pañal");
    } finally {
      setSaving(false);
    }
  };

  const handleImage = async () => {
    Alert.alert("Foto del pañal", "¿Cómo quieres agregar una foto?", [
      {
        text: "📷 Cámara",
        onPress: async () => {
          const uri = await takePhoto();
          if (uri) setImageUri(uri);
        },
      },
      {
        text: "🖼️ Galería",
        onPress: async () => {
          const uri = await pickImage();
          if (uri) setImageUri(uri);
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
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
          🍑 Nuevo Pañal
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 24 }}
      >
        {/* Pee */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#FFD700", fontWeight: "800", fontSize: 15 }}>
            💦 Pipí
          </Text>
          <PoopOMeter value={peeIntensity} onChange={setPeeIntensity} />
        </View>

        {/* Poop */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#8B4513", fontWeight: "800", fontSize: 15 }}>
            💩 Popó
          </Text>
          <PoopOMeter value={poopIntensity} onChange={setPoopIntensity} />
        </View>

        {/* Observations */}
        {observations && observations.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text
              style={{ color: "#FF8AB3", fontWeight: "800", fontSize: 15 }}
            >
              🔍 Observaciones
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {observations.map((obs) => {
                const isSelected = selectedObs.includes(obs.id);
                const isMedical = ["blood", "mucus", "diarrhea"].includes(obs.id);
                return (
                  <TouchableOpacity
                    key={obs.id}
                    onPress={() => toggleObs(obs.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 99,
                      backgroundColor: isSelected
                        ? isMedical
                          ? "#8B0000"
                          : "#FF8AB3"
                        : "#2A2A3E",
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{obs.emoji}</Text>
                    <Text
                      style={{
                        color: isSelected ? "#FFFFFF" : "#BBBBBB",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {obs.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedObs.some((id) =>
              ["blood", "mucus", "diarrhea"].includes(id)
            ) && (
              <View
                style={{
                  backgroundColor: "#3A0000",
                  borderRadius: 12,
                  padding: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: "#FF0000",
                }}
              >
                <Text style={{ color: "#FF6B6B", fontWeight: "700", fontSize: 13 }}>
                  ⚠️ Se detectaron observaciones que pueden requerir atención médica
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Photo */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: "#FF8AB3", fontWeight: "800", fontSize: 15 }}
          >
            📸 Foto
          </Text>
          {imageUri ? (
            <View style={{ alignItems: "flex-start", gap: 8 }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: 200, height: 200, borderRadius: 12 }}
                resizeMode="cover"
              />
              <TouchableOpacity onPress={() => setImageUri(null)}>
                <Text style={{ color: "#FF6B6B", fontWeight: "700", fontSize: 13 }}>
                  Eliminar foto
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleImage}
              style={{
                borderWidth: 2,
                borderColor: "#2A2A3E",
                borderStyle: "dashed",
                borderRadius: 12,
                padding: 24,
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={{ color: "#888888", fontWeight: "600", fontSize: 13 }}>
                Agregar foto
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 16 }} />

        <BigButton
          title={saving ? "Guardando..." : "💾 Guardar Pañal"}
          onPress={handleSave}
          disabled={saving}
          variant="primary"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
