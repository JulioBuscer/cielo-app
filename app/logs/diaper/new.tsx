import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import {
  useActiveFeedingSession,
  usePauseFeeding,
} from "@/src/hooks/useFeedingSessions";
import { useDiaperObservations, useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { useCamera } from "@/src/hooks/useCamera";
import { getZoneColor, getZoneLabel } from "@/src/db/schema";
import type { DiaperObservation } from "@/src/db/schema";

const PEE_CONFIG_KEY = "pee_config";
const DEFAULT_PEE_CONFIG = {
  scaleMin: 1,
  scaleMax: 8,
  zones: [
    { min: 1, max: 3, color: "#4CAF50", label: "Saludable" },
    { min: 4, max: 6, color: "#FFC107", label: "Precaución" },
    { min: 7, max: 8, color: "#F44336", label: "Alerta" },
  ],
};

function ScaleMeter({
  value,
  onChange,
  min,
  max,
  zonesJson,
  emoji,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  zonesJson: string | null;
  emoji: string;
  label?: string;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 12 }}>
          {label}
        </Text>
      )}
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        <TouchableOpacity
          onPress={() => onChange(0)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: value === 0 ? "#3A3A4E" : "#2A2A3E",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: value === 0 ? 2 : 1,
            borderColor: value === 0 ? "#FF8AB3" : "#3A3A4E",
          }}
        >
          <Text style={{ fontSize: 14, color: "#888" }}>✕</Text>
        </TouchableOpacity>
        {steps.map((n) => {
          const active = n <= value;
          const zoneColor = getZoneColor(zonesJson, n);
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: active ? zoneColor : "#2A2A3E",
                opacity: active ? 1 : 0.4,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 0 : 1,
                borderColor: "#3A3A4E",
              }}
            >
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value > 0 && getZoneLabel(zonesJson, value) && (
        <Text
          style={{
            color: getZoneColor(zonesJson, value),
            fontWeight: "700",
            fontSize: 12,
          }}
        >
          {getZoneLabel(zonesJson, value)}
        </Text>
      )}
    </View>
  );
}

export default function DiaperNewScreen() {
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: activeFeeding } = useActiveFeedingSession(baby?.id);
  const { data: observations } = useDiaperObservations();
  const pauseFeeding = usePauseFeeding();
  const saveEvent = useSaveTimelineEvent();
  const { pickImage, takePhoto } = useCamera();

  const [peeConfig, setPeeConfig] = useState(DEFAULT_PEE_CONFIG);
  const [peeIntensity, setPeeIntensity] = useState(0);
  const [poopIntensity, setPoopIntensity] = useState(0);
  const [obsValues, setObsValues] = useState<Record<string, number>>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [weightGrams, setWeightGrams] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PEE_CONFIG_KEY).then((json) => {
      if (json) {
        try {
          setPeeConfig(JSON.parse(json));
        } catch {}
      }
    });
  }, []);

  const toggleObs = (obs: DiaperObservation) => {
    const id = obs.id;
    setObsValues((prev) => {
      if (id in prev) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: obs.scaleMin ?? 1 };
    });
  };

  const isObsSelected = (id: string) => id in obsValues;

  const handleSave = async () => {
    if (!baby || !profile) return;
    setSaving(true);
    try {
      if (activeFeeding && activeFeeding.status === "active") {
        await pauseFeeding.mutateAsync(activeFeeding);
      }

      const obsWithScale: Record<string, number> = {};
      const obsNoScale: string[] = [];
      for (const [id, val] of Object.entries(obsValues)) {
        const ob = observations?.find((o) => o.id === id);
        if (ob?.scaleMin != null) {
          obsWithScale[id] = val;
        } else {
          obsNoScale.push(id);
        }
      }

      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "diaper",
        feedingSessionId: activeFeeding?.id,
        metadata: {
          peeIntensity,
          poopIntensity,
          observationIds: obsNoScale,
          observationValues: obsWithScale,
          imageUri: imageUri ?? undefined,
          weightGrams: weightGrams.trim() ? parseInt(weightGrams) : undefined,
        },
      });

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
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        {/* Pipímetro */}
        <ScaleMeter
          label="💦 Pipí"
          emoji="💧"
          value={peeIntensity}
          onChange={setPeeIntensity}
          min={peeConfig.scaleMin}
          max={peeConfig.scaleMax}
          zonesJson={JSON.stringify(peeConfig.zones)}
        />

        {/* Popó */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#8B4513", fontWeight: "800", fontSize: 15 }}>
            💩 Popó
          </Text>
          <ScaleMeter
            emoji="🟤"
            value={poopIntensity}
            onChange={setPoopIntensity}
            min={0}
            max={5}
            zonesJson={JSON.stringify([
              { min: 1, max: 2, color: "#8B4513", label: "Poco" },
              { min: 3, max: 4, color: "#654321", label: "Normal" },
              { min: 5, max: 5, color: "#3E2723", label: "Mucho" },
            ])}
          />
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
                const selected = isObsSelected(obs.id);
                const isMedical = ["blood", "mucus", "diarrhea"].includes(obs.id);
                const hasScale = obs.scaleMin != null;
                const bgColor = selected
                  ? isMedical
                    ? "#8B0000"
                    : "#FF8AB3"
                  : "#2A2A3E";
                return (
                  <TouchableOpacity
                    key={obs.id}
                    onPress={() => toggleObs(obs)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 99,
                      backgroundColor: bgColor,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{obs.emoji}</Text>
                    <Text
                      style={{
                        color: selected ? "#FFFFFF" : "#BBBBBB",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {obs.label}
                    </Text>
                    {selected && hasScale && obsValues[obs.id] > 0 && (
                      <Text
                        style={{
                          color: getZoneColor(obs.zones, obsValues[obs.id]),
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        {obsValues[obs.id]}
                      </Text>
                    )}
                    {selected && hasScale && (
                      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                        ✕
                      </Text>
                    )}
                    {selected && !hasScale && (
                      <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Expanded sliders for selected observations with scale */}
            {observations
              .filter((o) => isObsSelected(o.id) && o.scaleMin != null)
              .map((obs) => (
                <View
                  key={obs.id}
                  style={{
                    backgroundColor: "#2A2A3E",
                    borderRadius: 12,
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {obs.emoji} {obs.label}
                  </Text>
                  <ScaleMeter
                    emoji={obs.emoji}
                    value={obsValues[obs.id] ?? obs.scaleMin!}
                    onChange={(v) =>
                      setObsValues((prev) => ({ ...prev, [obs.id]: v }))
                    }
                    min={obs.scaleMin!}
                    max={obs.scaleMax!}
                    zonesJson={obs.zones}
                  />
                </View>
              ))}

            {/* Medical alert */}
            {Object.keys(obsValues).some((id) =>
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

        {/* Diaper weight */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
            ⚖️ Peso del pañal (gramos)
          </Text>
          <TextInput
            value={weightGrams}
            onChangeText={setWeightGrams}
            placeholder="0"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 14,
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: "700",
            }}
          />
        </View>

        {/* Photo */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#FF8AB3", fontWeight: "800", fontSize: 15 }}>
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

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#3A3A4E" : "#FF8AB3",
            paddingVertical: 16,
            borderRadius: 99,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "900",
              fontSize: 16,
            }}
          >
            {saving ? "Guardando..." : "💾 Guardar Pañal"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
