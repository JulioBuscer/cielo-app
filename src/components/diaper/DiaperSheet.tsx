import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { BigButton } from "@/src/components/ui/BigButton";
import { ScaleMeter, MetricSlider, ZoneNote } from "@/src/components/ui/ScaleMeter";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import {
  useActiveFeedingSession,
  usePauseFeeding,
} from "@/src/hooks/useFeedingSessions";
import { useSaveTimelineEvent, useDiaperObservations } from "@/src/hooks/useTimeline";
import { useCamera } from "@/src/hooks/useCamera";
import { parseMetrics } from "@/src/db/schema";
import type { DiaperObservation } from "@/src/db/schema";
import {
  DEFAULT_PEE_INTENSITY,
  DEFAULT_POOP_INTENSITY,
  DEFAULT_PEE_HEALTH,
  DEFAULT_POOP_HEALTH,
  DEFAULT_POOP_CONSISTENCY,
  getDiaperConfigs,
} from "@/src/utils/diaperDefaults";

export function DiaperSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: activeFeeding } = useActiveFeedingSession(baby?.id);
  const { data: observations } = useDiaperObservations();
  const pauseFeeding = usePauseFeeding();
  const saveEvent = useSaveTimelineEvent();
  const { takePhoto, pickImage } = useCamera();

  const [peeIntensityCfg] = useState(DEFAULT_PEE_INTENSITY);
  const [poopIntensityCfg] = useState(DEFAULT_POOP_INTENSITY);
  const [peeHealthCfg, setPeeHealthCfg] = useState(DEFAULT_PEE_HEALTH);
  const [poopHealthCfg, setPoopHealthCfg] = useState(DEFAULT_POOP_HEALTH);
  const [poopConsistencyCfg, setPoopConsistencyCfg] = useState(DEFAULT_POOP_CONSISTENCY);

  const [peeIntensity, setPeeIntensity] = useState(3);
  const [poopIntensity, setPoopIntensity] = useState(0);
  const [peeHealth, setPeeHealth] = useState(0);
  const [poopHealth, setPoopHealth] = useState(0);
  const [poopConsistency, setPoopConsistency] = useState(0);
  const [selectedObs, setSelectedObs] = useState<Record<string, Record<string, number>>>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [weightGrams, setWeightGrams] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getDiaperConfigs().then((cfg) => {
      setPeeHealthCfg(cfg.peeHealth);
      setPoopHealthCfg(cfg.poopHealth);
      setPoopConsistencyCfg(cfg.poopConsistency);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      setPeeIntensity(3);
      setPoopIntensity(0);
      setPeeHealth(1);
      setPoopHealth(2);
      setPoopConsistency(3);
      setSelectedObs({});
      setImageUri(null);
      setWeightGrams("");
      setShowDetails(false);
      setTimestamp(new Date());
      setNotes("");
    }
  }, [visible]);

  const findZone = (cfg: { zones: { min: number; max: number; emoji?: string; label: string; isAlert?: boolean; note?: string }[] }, value: number) =>
    cfg.zones.find((z) => value >= z.min && value <= z.max);

  const toggleObs = (obs: DiaperObservation) => {
    const id = obs.id;
    setSelectedObs((prev) => {
      if (id in prev) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      const metrics = parseMetrics(obs.metrics);
      if (metrics.length === 0) return { ...prev, [id]: {} };
      const initial: Record<string, number> = {};
      for (const m of metrics) initial[m.id] = m.scaleMin;
      return { ...prev, [id]: initial };
    });
  };

  const isObsSelected = (id: string) => id in selectedObs;
  const isMedical = (id: string) => ["blood", "mucus"].includes(id);

  const handleSave = async () => {
    if (!baby || !profile) return;
    setSaving(true);
    try {
      if (activeFeeding?.status === "active") {
        await pauseFeeding.mutateAsync(activeFeeding);
      }

      const obsWithScale: Record<string, Record<string, number>> = {};
      const allObsIds: string[] = [];
      for (const [id, metrics] of Object.entries(selectedObs)) {
        allObsIds.push(id);
        if (Object.keys(metrics).length > 0) obsWithScale[id] = metrics;
      }

      const peeIntensityZone = findZone(peeIntensityCfg, peeIntensity);
      const poopIntensityZone = poopIntensity > 0 ? findZone(poopIntensityCfg, poopIntensity) : null;
      const peeHealthZone = peeHealthCfg.enabled && peeIntensity > 0 && peeHealth > 0 ? findZone(peeHealthCfg, peeHealth) : null;
      const poopHealthZone = poopHealthCfg.enabled && poopIntensity > 0 && poopHealth > 0 ? findZone(poopHealthCfg, poopHealth) : null;
      const poopConsistencyZone = poopIntensity > 0 && poopConsistency > 0 ? findZone(poopConsistencyCfg, poopConsistency) : null;

      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "diaper",
        feedingSessionId: activeFeeding?.id,
        timestamp,
        notes: notes.trim() || undefined,
        metadata: {
          peeIntensity,
          poopIntensity,
          peeHealth: peeHealthCfg.enabled && peeIntensity > 0 ? peeHealth : null,
          poopHealth: poopHealthCfg.enabled && poopIntensity > 0 ? poopHealth : null,
          poopConsistency: poopIntensity > 0 ? poopConsistency : 0,
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

      onClose();
    } catch {
      Alert.alert("Error", "No se pudo guardar el pañal");
    } finally {
      setSaving(false);
    }
  };

  const handleImage = () => {
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

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "80%",
            paddingBottom: Platform.OS === "ios" ? 20 : 8,
          }}
        >
          <ScrollView
            //style={{ maxHeight: "75%" }}
            contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 0 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 40 }}>🍑</Text>
              <Text style={{ color: c.textBody, fontSize: 20, fontWeight: "800" }}>Pañal</Text>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ color: c.growth, fontWeight: "800", fontSize: 15 }}>💧 Pipí</Text>
              <ScaleMeter
                label="Cantidad"
                emoji="💧"
                value={peeIntensity}
                onChange={(v) => setPeeIntensity(v === peeIntensity ? 0 : v)}
                min={peeIntensityCfg.min}
                max={peeIntensityCfg.max}
                zones={peeIntensityCfg.zones}
              />
              {peeIntensity > 0 && peeHealthCfg.enabled && (
                <>
                  <ScaleMeter
                    label="Pipímetro (color de orina)"
                    emoji="🔬"
                    value={peeHealth}
                    onChange={(v) => setPeeHealth(v === peeHealth ? 0 : v)}
                    min={peeHealthCfg.min}
                    max={peeHealthCfg.max}
                    zones={peeHealthCfg.zones}
                  />
                  <ZoneNote zone={peeHealth > 0 ? findZone(peeHealthCfg, peeHealth) : null} />
                </>
              )}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ color: (c as any).biological?.poop ?? "#8B6914", fontWeight: "800", fontSize: 15 }}>💩 Popó</Text>
              <ScaleMeter
                label="Cantidad"
                emoji="🟤"
                value={poopIntensity}
                onChange={(v) => setPoopIntensity(v === poopIntensity ? 0 : v)}
                min={poopIntensityCfg.min}
                max={poopIntensityCfg.max}
                zones={poopIntensityCfg.zones}
              />
              {poopIntensity > 0 && (
                <>
                  {poopHealthCfg.enabled && (
                    <ScaleMeter
                      label="Color"
                      emoji="🎨"
                      value={poopHealth}
                      onChange={(v) => setPoopHealth(v === poopHealth ? 0 : v)}
                      min={poopHealthCfg.min}
                      max={poopHealthCfg.max}
                      zones={poopHealthCfg.zones}
                    />
                  )}
                  <ZoneNote zone={poopHealth > 0 ? findZone(poopHealthCfg, poopHealth) : null} />
                  <ScaleMeter
                    label="Consistencia"
                    emoji="💩"
                    value={poopConsistency}
                    onChange={(v) => setPoopConsistency(v === poopConsistency ? 0 : v)}
                    min={poopConsistencyCfg.min}
                    max={poopConsistencyCfg.max}
                    zones={poopConsistencyCfg.zones}
                  />
                  <ZoneNote zone={poopConsistency > 0 ? findZone(poopConsistencyCfg, poopConsistency) : null} />
                </>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowDetails(!showDetails)}
              style={{ alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={{ color: c.accentStrong, fontWeight: "700", fontSize: 15 }}>
                {showDetails ? "📋 Menos detalles ▴" : "📋 Más detalles ▾"}
              </Text>
            </TouchableOpacity>

            {showDetails && (
              <>
                {observations && observations.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: c.accent, fontWeight: "800", fontSize: 15 }}>🔬 Observaciones</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {observations.filter((o) => o.id !== "diarrhea").map((obs) => {
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
                                ? medical ? c.danger : c.accent
                                : c.card,
                            }}
                          >
                            <Text style={{ fontSize: 16 }}>{obs.emoji}</Text>
                            <Text style={{ color: selected ? c.textBody : c.textMuted, fontWeight: "700", fontSize: 13 }}>
                              {obs.label}
                            </Text>
                            {selected && <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {observations.filter((o) => isObsSelected(o.id)).map((obs) => {
                      const metrics = parseMetrics(obs.metrics);
                      if (metrics.length === 0) return null;
                      return (
                        <View key={obs.id} style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, gap: 10 }}>
                          <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 14 }}>
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
                                  [obs.id]: { ...(prev[obs.id] ?? {}), [m.id]: v },
                                }))
                              }
                            />
                          ))}
                        </View>
                      );
                    })}

                    {(poopConsistency === 4 || Object.keys(selectedObs).some((id) => {
                      const obs = observations?.find((o) => o.id === id);
                      if (!obs?.isAlert) return false;
                      const metrics = parseMetrics(obs.metrics);
                      if (!metrics.length) return true;
                      if (id === "blood") return true;
                      return metrics.some((m) => {
                        const v = selectedObs[id]?.[m.id];
                        if (v == null) return false;
                        const lastZone = m.zones?.[m.zones.length - 1];
                        return lastZone && v >= lastZone.min && v <= lastZone.max;
                      });
                    })) && (
                        <View style={{ backgroundColor: c.danger + "20", borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: c.danger }}>
                          <Text style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}>
                            ⚠️ Se detectaron observaciones que pueden requerir atención médica
                          </Text>
                        </View>
                      )}
                  </View>
                )}

                <View style={{ gap: 6 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>⚖️ Peso del pañal (gramos)</Text>
                  <TextInput
                    value={weightGrams}
                    onChangeText={setWeightGrams}
                    placeholder="0"
                    placeholderTextColor={c.textMuted}
                    keyboardType="number-pad"
                    style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, color: c.textBody, fontSize: 18, fontWeight: "700" }}
                  />
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ color: c.accent, fontWeight: "800", fontSize: 15 }}>📸 Foto</Text>
                  {imageUri ? (
                    <View style={{ alignItems: "flex-start", gap: 8 }}>
                      <Image source={{ uri: imageUri }} style={{ width: 200, height: 200, borderRadius: 12 }} resizeMode="cover" />
                      <TouchableOpacity onPress={() => setImageUri(null)}>
                        <Text style={{ color: c.danger, fontWeight: "700", fontSize: 13 }}>Eliminar foto</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleImage}
                      style={{ borderWidth: 2, borderColor: c.card, borderStyle: "dashed", borderRadius: 12, padding: 24, alignItems: "center", gap: 4 }}
                    >
                      <Text style={{ fontSize: 32 }}>📷</Text>
                      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 13 }}>Agregar foto</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>🕐 Hora</Text>
                  <DateTimePicker value={timestamp} onChange={setTimestamp} />
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>📝 Notas</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Nota opcional..."
                    placeholderTextColor={c.textDim}
                    multiline
                    style={{ backgroundColor: c.card, borderRadius: 12, padding: 12, color: c.textBody, fontSize: 15, minHeight: 60, textAlignVertical: "top" }}
                  />
                </View>
              </>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>

        </View>
        <View style={{
          paddingHorizontal: 24, paddingVertical: 12,
          backgroundColor: c.surface,
        }}>
          <BigButton
            title={poopIntensity === 0 ? "Guardar Rápido 💧" : "Guardar Pañal 💩"}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </View>
      </View>
    </Modal>
  );
}
