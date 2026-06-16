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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import {
  useActiveFeedingSession,
  usePauseFeeding,
} from "@/src/hooks/useFeedingSessions";
import { useDiaperObservations, useSaveTimelineEvent } from "@/src/hooks/useTimeline";
import { useCamera } from "@/src/hooks/useCamera";
import { useTheme } from "@/src/theme/useTheme";
import { parseMetrics } from "@/src/db/schema";
import type { DiaperObservation } from "@/src/db/schema";
import { ScaleMeter, MetricSlider, ZoneNote } from "@/src/components/ui/ScaleMeter";
import {
  DEFAULT_PEE_INTENSITY, DEFAULT_POOP_INTENSITY,
  DEFAULT_PEE_HEALTH, DEFAULT_POOP_HEALTH, DEFAULT_POOP_CONSISTENCY,
  getDiaperConfigs,
} from "@/src/utils/diaperDefaults";

export default function DiaperNewScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: activeFeeding } = useActiveFeedingSession(baby?.id);
  const { data: observations } = useDiaperObservations();
  const pauseFeeding = usePauseFeeding();
  const saveEvent = useSaveTimelineEvent();
  const { uri: camUri, takePhoto, pickImage, discard: discardPhoto } = useCamera();

  // Configs from AsyncStorage
  const [peeIntensityCfg, setPeeIntensityCfg] = useState(DEFAULT_PEE_INTENSITY);
  const [poopIntensityCfg, setPoopIntensityCfg] = useState(DEFAULT_POOP_INTENSITY);
  const [peeHealthCfg, setPeeHealthCfg] = useState(DEFAULT_PEE_HEALTH);
  const [poopHealthCfg, setPoopHealthCfg] = useState(DEFAULT_POOP_HEALTH);
  const [poopConsistencyCfg, setPoopConsistencyCfg] = useState(DEFAULT_POOP_CONSISTENCY);

  // Values
  const [peeIntensity, setPeeIntensity] = useState(0);
  const [poopIntensity, setPoopIntensity] = useState(0);
  const [peeHealth, setPeeHealth] = useState(0);
  const [poopHealth, setPoopHealth] = useState(0);
  const [poopConsistency, setPoopConsistency] = useState(0);
  const [selectedObs, setSelectedObs] = useState<Record<string, Record<string, number>>>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [weightGrams, setWeightGrams] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDiaperConfigs().then((cfg) => {
      setPeeIntensityCfg(cfg.peeIntensity);
      setPoopIntensityCfg(cfg.poopIntensity);
      setPeeHealthCfg(cfg.peeHealth);
      setPoopHealthCfg(cfg.poopHealth);
      setPoopConsistencyCfg(cfg.poopConsistency);
    });
  }, []);

  const toggleObs = (obs: DiaperObservation) => {
    const id = obs.id;
    setSelectedObs((prev) => {
      if (id in prev) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      const metrics = parseMetrics(obs.metrics);
      if (metrics.length === 0) {
        return { ...prev, [id]: {} };
      }
      const initial: Record<string, number> = {};
      for (const m of metrics) {
        initial[m.id] = m.scaleMin;
      }
      return { ...prev, [id]: initial };
    });
  };

  const isObsSelected = (id: string) => id in selectedObs;

  const findZone = (cfg: { zones: { min: number; max: number; emoji?: string; label: string; isAlert?: boolean; note?: string }[] }, value: number) =>
    cfg.zones.find((z) => value >= z.min && value <= z.max);

  const handleSave = async () => {
    if (!baby || !profile) return;
    setSaving(true);
    try {
      if (activeFeeding && activeFeeding.status === "active") {
        await pauseFeeding.mutateAsync(activeFeeding);
      }

      const obsWithScale: Record<string, Record<string, number>> = {};
      const allObsIds: string[] = [];
      for (const [id, metrics] of Object.entries(selectedObs)) {
        allObsIds.push(id);
        if (Object.keys(metrics).length > 0) {
          obsWithScale[id] = metrics;
        }
      }

      const peeIntensityZone = findZone(peeIntensityCfg, peeIntensity);
      const poopIntensityZone = findZone(poopIntensityCfg, poopIntensity);
      const peeHealthZone = peeHealthCfg.enabled && peeHealth > 0 ? findZone(peeHealthCfg, peeHealth) : null;
      const poopHealthZone = poopHealthCfg.enabled && poopHealth > 0 ? findZone(poopHealthCfg, poopHealth) : null;
      const poopConsistencyZone = findZone(poopConsistencyCfg, poopConsistency);

      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "diaper",
        feedingSessionId: activeFeeding?.id,
        timestamp: new Date(),
        metadata: {
          peeIntensity,
          poopIntensity,
          peeHealth: peeHealthCfg.enabled ? peeHealth : null,
          poopHealth: poopHealthCfg.enabled ? poopHealth : null,
          poopConsistency,
          peeIntensityZone: peeIntensityZone ? { emoji: peeIntensityZone.emoji ?? "", label: peeIntensityZone.label } : null,
          poopIntensityZone: poopIntensityZone ? { emoji: poopIntensityZone.emoji ?? "", label: poopIntensityZone.label } : null,
          peeHealthZone: peeHealthZone ? { emoji: peeHealthZone.emoji ?? "", label: peeHealthZone.label, isAlert: peeHealthZone.isAlert, note: peeHealthZone.note } : null,
          poopHealthZone: poopHealthZone ? { emoji: poopHealthZone.emoji ?? "", label: poopHealthZone.label, isAlert: poopHealthZone.isAlert, note: poopHealthZone.note } : null,
          poopConsistencyZone: poopConsistencyZone ? { emoji: poopConsistencyZone.emoji ?? "", label: poopConsistencyZone.label, isAlert: poopConsistencyZone.isAlert, note: poopConsistencyZone.note } : null,
          peeHealthAlert: !!peeHealthZone?.isAlert,
          poopHealthAlert: !!poopHealthZone?.isAlert,
          poopConsistencyAlert: !!poopConsistencyZone?.isAlert,
          observationIds: allObsIds,
          observationValues: Object.keys(obsWithScale).length > 0 ? obsWithScale : null,
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

  const isMedical = (id: string) => ["blood", "mucus"].includes(id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.card,
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
            color: c.headerText,
          }}
        >
          🍑 Nuevo Pañal
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── PIPÍ ─── */}
        <View style={{ gap: 10 }}>
          <Text style={{ color: c.growth, fontWeight: "800", fontSize: 15 }}>
            💧 Pipí
          </Text>
          <ScaleMeter
            label="Cantidad"
            emoji="💧"
            value={peeIntensity}
            onChange={setPeeIntensity}
            min={peeIntensityCfg.min}
            max={peeIntensityCfg.max}
            zones={peeIntensityCfg.zones}
          />
          {peeHealthCfg.enabled && (
          <ScaleMeter
            label="Pipímetro (color de orina)"
            emoji="🔬"
            value={peeHealth}
            onChange={setPeeHealth}
            min={peeHealthCfg.min}
            max={peeHealthCfg.max}
            zones={peeHealthCfg.zones}
          />
          )}
          <ZoneNote zone={peeHealthCfg.enabled && peeHealth > 0 ? findZone(peeHealthCfg, peeHealth) : null} />
        </View>

        {/* ─── POPÓ ─── */}
        <View style={{ gap: 10 }}>
          <Text style={{ color: c.biological.poop, fontWeight: "800", fontSize: 15 }}>
            💩 Popó
          </Text>
          <ScaleMeter
            label="Cantidad"
            emoji="🟤"
            value={poopIntensity}
            onChange={setPoopIntensity}
            min={poopIntensityCfg.min}
            max={poopIntensityCfg.max}
            zones={poopIntensityCfg.zones}
          />
          {poopHealthCfg.enabled && (
          <ScaleMeter
            label="Color"
            emoji="🎨"
            value={poopHealth}
            onChange={setPoopHealth}
            min={poopHealthCfg.min}
            max={poopHealthCfg.max}
            zones={poopHealthCfg.zones}
          />
          )}
          <ZoneNote zone={poopHealthCfg.enabled && poopHealth > 0 ? findZone(poopHealthCfg, poopHealth) : null} />
          <ScaleMeter
            label="Consistencia"
            emoji="💩"
            value={poopConsistency}
            onChange={setPoopConsistency}
            min={poopConsistencyCfg.min}
            max={poopConsistencyCfg.max}
            zones={poopConsistencyCfg.zones}
          />
          <ZoneNote zone={poopConsistency > 0 ? findZone(poopConsistencyCfg, poopConsistency) : null} />
        </View>

        {/* ─── OBSERVACIONES ─── */}
        {observations && observations.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text
              style={{ color: c.accent, fontWeight: "800", fontSize: 15 }}
            >
              🔬 Observaciones
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {observations.filter((o) => o.id !== 'diarrhea').map((obs) => {
                const selected = isObsSelected(obs.id);
                const medical = isMedical(obs.id);
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
                      backgroundColor: selected
                        ? medical
                          ? c.danger
                          : c.accent
                        : c.card,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{obs.emoji}</Text>
                    <Text
                      style={{
                        color: selected ? c.textBody : c.textMuted,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {obs.label}
                    </Text>
                    {selected && (
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Expanded metric sliders */}
            {observations
              .filter((o) => isObsSelected(o.id))
              .map((obs) => {
                const metrics = parseMetrics(obs.metrics);
                if (metrics.length === 0) return null;
                return (
                  <View
                    key={obs.id}
                    style={{
                      backgroundColor: c.card,
                      borderRadius: 12,
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: c.textBody,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {obs.emoji} {obs.label}
                    </Text>
                    {metrics.map((m) => (
                      <MetricSlider
                        key={m.id}
                        metric={m}
                        value={selectedObs[obs.id]?.[m.id] ?? m.scaleMin}
                        onChange={(v) =>
                          setSelectedObs((prev) => ({
                            ...prev,
                            [obs.id]: {
                              ...(prev[obs.id] ?? {}),
                              [m.id]: v,
                            },
                          }))
                        }
                      />
                    ))}
                  </View>
                );
              })}

            {/* Medical alert — severity-based */}
            {(poopConsistency === 4 || Object.keys(selectedObs).some((id) => {
              const obs = observations?.find((o) => o.id === id);
              if (!obs?.isAlert) return false;
              const metrics = parseMetrics(obs.metrics);
              if (!metrics.length) return true;
              if (id === 'blood') return true;
              return metrics.some((m) => {
                const v = selectedObs[id]?.[m.id];
                if (v == null) return false;
                const lastZone = m.zones?.[m.zones.length - 1];
                return lastZone && v >= lastZone.min && v <= lastZone.max;
              });
            })) && (
              <View
                style={{
                  backgroundColor: c.danger + "20",
                  borderRadius: 12,
                  padding: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: c.danger,
                }}
              >
                <Text style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}>
                  ⚠️ Se detectaron observaciones que pueden requerir atención médica
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── PESO ─── */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
            ⚖️ Peso del pañal (gramos)
          </Text>
          <TextInput
            value={weightGrams}
            onChangeText={setWeightGrams}
            placeholder="0"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            style={{
              backgroundColor: c.card,
              borderRadius: 12,
              padding: 14,
              color: c.textBody,
              fontSize: 18,
              fontWeight: "700",
            }}
          />
        </View>

        {/* ─── FOTO ─── */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.accent, fontWeight: "800", fontSize: 15 }}>
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
                <Text style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}>
                  Eliminar foto
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleImage}
              style={{
                borderWidth: 2,
                borderColor: c.card,
                borderStyle: "dashed",
                borderRadius: 12,
                padding: 24,
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 13 }}>
                Agregar foto
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 16 }} />

        {/* ─── GUARDAR ─── */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? c.elevated : c.accent,
            paddingVertical: 16,
            borderRadius: 99,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: c.textBody,
              fontWeight: "900",
              fontSize: 16,
            }}
          >
            {saving ? "Guardando..." : "💾 Guardar Pañal"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}