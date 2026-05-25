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
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import {
  useTimelineEvent,
  useUpdateTimelineEvent,
  useDiaperObservations,
} from "@/src/hooks/useTimeline";
import { useCamera } from "@/src/hooks/useCamera";
import { useTheme } from "@/src/theme/useTheme";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import {
  parseMetrics,
  getMetricZoneColor,
  getMetricZoneLabel,
} from "@/src/db/schema";
import type { DiaperObservation, ObservationMetric } from "@/src/db/schema";

const DEFAULT_PEE_INTENSITY = { min: 1, max: 4, zones: [
  { min: 1, max: 1, color: "#BBDEFB", label: "Poquitita", emoji: "💧" },
  { min: 2, max: 2, color: "#64B5F6", label: "Poquita",   emoji: "💧" },
  { min: 3, max: 3, color: "#1E88E5", label: "Normal",    emoji: "💦" },
  { min: 4, max: 4, color: "#0D47A1", label: "Mucha",     emoji: "🌊" },
] };
const DEFAULT_POOP_INTENSITY = { min: 1, max: 4, zones: [
  { min: 1, max: 1, color: "#D2B48C", label: "Poquitita", emoji: "💩" },
  { min: 2, max: 2, color: "#A0785A", label: "Poquita",   emoji: "💩" },
  { min: 3, max: 3, color: "#8B6914", label: "Normal",    emoji: "💩" },
  { min: 4, max: 4, color: "#5C4033", label: "Mucha",     emoji: "💩💩" },
] };
const DEFAULT_PEE_HEALTH = { enabled: true, min: 1, max: 8, zones: [
  { min: 1, max: 1, color: "#E8F5E9", label: "Transparente",  emoji: "💧" },
  { min: 2, max: 2, color: "#FFF9C4", label: "Amarillo claro", emoji: "💛" },
  { min: 3, max: 3, color: "#FFE082", label: "Amarillo",      emoji: "💛" },
  { min: 4, max: 4, color: "#FFB300", label: "Amarillo oscuro", emoji: "🟡" },
  { min: 5, max: 5, color: "#FF8F00", label: "Ámbar",         emoji: "🟠" },
  { min: 6, max: 6, color: "#E65100", label: "Naranja",       emoji: "🟠" },
  { min: 7, max: 7, color: "#BF360C", label: "Anaranjado rojizo", emoji: "🔶", isAlert: true, note: "Podría ser sangre o pigmentos. Observa y consulta si persiste." },
  { min: 8, max: 8, color: "#8D6E63", label: "Café/Rojizo",   emoji: "🚨", isAlert: true, note: "Posible sangre. Consulta con tu pediatra." },
] };
const DEFAULT_POOP_HEALTH = { enabled: true, min: 1, max: 8, zones: [
  { min: 1, max: 1, color: "#8BC34A", label: "Verde",   emoji: "🟢" },
  { min: 2, max: 2, color: "#FFC107", label: "Amarillo", emoji: "🟡" },
  { min: 3, max: 3, color: "#8B4513", label: "Marrón",  emoji: "🟤" },
  { min: 4, max: 4, color: "#E65100", label: "Naranja", emoji: "🟠" },
  { min: 5, max: 5, color: "#9E9E9E", label: "Arcilla", emoji: "🩻",  isAlert: true, note: "Poco común. Podría indicar problema hepático. Consulta con tu pediatra." },
  { min: 6, max: 6, color: "#B71C1C", label: "Rojo",    emoji: "💉",  isAlert: true, note: "Sangre fresca. Puede ser fisura o alergia. Consulta con tu pediatra." },
  { min: 7, max: 7, color: "#212121", label: "Negro",   emoji: "⚫",  isAlert: true, note: "Sangre digerida (excepto meconio en recién nacidos). Consulta con tu pediatra." },
  { min: 8, max: 8, color: "#EEEEEE", label: "Blanco",  emoji: "⚪",  isAlert: true, note: "Puede indicar obstrucción biliar. Consulta con tu pediatra lo antes posible." },
] };
const DEFAULT_POOP_CONSISTENCY = { min: 1, max: 5, zones: [
  { min: 1, max: 1, color: "#6D4C41", label: "Dura",   emoji: "💎", isAlert: true, note: "Estreñimiento. Ofrece más líquidos, consulta si persiste." },
  { min: 2, max: 2, color: "#8D6E63", label: "Sólida", emoji: "🍫" },
  { min: 3, max: 3, color: "#A1887F", label: "Pastosa", emoji: "🥜" },
  { min: 4, max: 4, color: "#BCAAA4", label: "Líquida", emoji: "💧" },
  { min: 5, max: 5, color: "#EF5350", label: "Acuosa",  emoji: "🌊", isAlert: true, note: "Posible diarrea. Vigila signos de deshidratación." },
] };

function ScaleMeter({
  value,
  onChange,
  min,
  max,
  zones,
  emoji,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  zones: { min: number; max: number; color: string; label: string; emoji?: string }[];
  emoji: string;
  label?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const zoneFor = (n: number) => zones.find((z) => n >= z.min && n <= z.max);

  return (
    <View style={{ gap: 4 }}>
      {label && (
        <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 12 }}>
          {label}
        </Text>
      )}
      <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
        {steps.map((n) => {
          const active = n === value;
          const z = zoneFor(n);
          const bgColor = active && z ? z.color : c.card;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: bgColor,
                opacity: active ? 1 : 0.35,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 0 : 1,
                borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 14 }}>{z?.emoji ?? emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value > 0 && zoneFor(value) && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {zoneFor(value)?.emoji ? (
            <Text style={{ fontSize: 14 }}>{zoneFor(value)?.emoji}</Text>
          ) : null}
          <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 11 }}>
            {zoneFor(value)?.label}
          </Text>
        </View>
      )}
    </View>
  );
}

function MetricSlider({
  metric,
  value,
  onChange,
}: {
  metric: ObservationMetric;
  value: number;
  onChange: (v: number) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const steps = Array.from({ length: metric.scaleMax - metric.scaleMin + 1 }, (_, i) => metric.scaleMin + i);
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11 }}>
        {metric.name}
      </Text>
      <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
        {steps.map((n) => {
          const active = n === value;
          const z = metric.zones.find((z) => n >= z.min && n <= z.max);
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: active && z ? z.color : c.card,
                opacity: active ? 1 : 0.35,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 0 : 1,
                borderColor: c.elevated,
              }}
            >
              <Text style={{ fontSize: 12 }}>{z?.emoji ?? ""}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value > 0 && (() => {
        const z = metric.zones.find((z) => value >= z.min && value <= z.max);
        if (!z) return null;
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {z.emoji ? <Text style={{ fontSize: 12 }}>{z.emoji}</Text> : null}
            <Text style={{ color: z.color, fontWeight: "700", fontSize: 11 }}>{z.label}</Text>
          </View>
        );
      })()}
    </View>
  );
}

function formatDateTime(ts: Date | string | number | undefined | null): string {
  if (!ts) return "--";
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hour}:${min}`;
}

export default function DiaperDetailScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event } = useTimelineEvent(id);
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: observations } = useDiaperObservations();
  const updateEvent = useUpdateTimelineEvent();
  const { uri: camUri, takePhoto, pickImage, discard: discardPhoto } = useCamera();
  const [editing, setEditing] = useState(false);

  // Configs from AsyncStorage
  const [peeIntensityCfg, setPeeIntensityCfg] = useState(DEFAULT_PEE_INTENSITY);
  const [poopIntensityCfg, setPoopIntensityCfg] = useState(DEFAULT_POOP_INTENSITY);
  const [peeHealthCfg, setPeeHealthCfg] = useState(DEFAULT_PEE_HEALTH);
  const [poopHealthCfg, setPoopHealthCfg] = useState(DEFAULT_POOP_HEALTH);
  const [poopConsistencyCfg, setPoopConsistencyCfg] = useState(DEFAULT_POOP_CONSISTENCY);

  // Edit values
  const [peeIntensity, setPeeIntensity] = useState(0);
  const [poopIntensity, setPoopIntensity] = useState(0);
  const [peeHealth, setPeeHealth] = useState(0);
  const [poopHealth, setPoopHealth] = useState(0);
  const [poopConsistency, setPoopConsistency] = useState(0);
  const [selectedObs, setSelectedObs] = useState<Record<string, Record<string, number>>>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [weightGrams, setWeightGrams] = useState("");
  const [editTimestamp, setEditTimestamp] = useState<Date>(new Date());
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMeta, setSavedMeta] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('pee_intensity_config'),
      AsyncStorage.getItem('poop_intensity_config'),
      AsyncStorage.getItem('pee_health_config'),
      AsyncStorage.getItem('poop_health_config'),
      AsyncStorage.getItem('poop_consistency_config'),
    ]).then(([pi, poi, ph, poh, pc]) => {
      if (pi) try { setPeeIntensityCfg(JSON.parse(pi)); } catch {}
      if (poi) try { setPoopIntensityCfg(JSON.parse(poi)); } catch {}
      if (ph) try { setPeeHealthCfg(JSON.parse(ph)); } catch {}
      if (poh) try { setPoopHealthCfg(JSON.parse(poh)); } catch {}
      if (pc) try { setPoopConsistencyCfg(JSON.parse(pc)); } catch {}
    });
  }, []);

  // Pre-populate from event metadata
  useEffect(() => {
    if (!event || !observations) return;
    const meta = event.metadata ? JSON.parse(event.metadata) : {};
    setPeeIntensity(meta.peeIntensity ?? 0);
    setPoopIntensity(meta.poopIntensity ?? 0);
    setPeeHealth(meta.peeHealth ?? 0);
    setPoopHealth(meta.poopHealth ?? 0);
    setPoopConsistency(meta.poopConsistency ?? 0);
    setImageUri(meta.imageUri ?? null);
    setWeightGrams(meta.weightGrams ? String(meta.weightGrams) : "");
    setEditTimestamp(new Date(event.timestamp));
    setEditNotes(event.notes ?? "");

    // Rebuild selectedObs from saved data
    const obs: Record<string, Record<string, number>> = {};
    for (const oid of meta.observationIds ?? []) {
      obs[oid] = {};
    }
    if (meta.observationValues) {
      for (const [oid, vals] of Object.entries(meta.observationValues)) {
        obs[oid] = vals as Record<string, number>;
      }
    }
    setSelectedObs(obs);
  }, [event, observations]);

  const isOwn = event?.profileId === profile?.id;
  const rawMeta: any = event?.metadata ? (() => { try { return JSON.parse(event.metadata); } catch { return {}; } })() : {};
  const meta: any = savedMeta ?? rawMeta;
  const peeHealthAlert = !!(meta.peeHealthAlert ?? (meta.peeHealth ?? 0) >= 7);
  const poopHealthAlert = !!(meta.poopHealthAlert ?? (meta.poopHealth ?? 0) >= 5);
  const poopConsistencyAlert = !!(meta.poopConsistencyAlert ?? (meta.poopConsistency === 1 || meta.poopConsistency === 5));
  const anyAlert = peeHealthAlert || poopHealthAlert || poopConsistencyAlert;

  const findZone = (cfg: { zones: { min: number; max: number; emoji?: string; label: string; isAlert?: boolean; note?: string }[] }, value: number) =>
    cfg.zones.find((z) => value >= z.min && value <= z.max);

  const toggleObs = (obs: DiaperObservation) => {
    const oid = obs.id;
    setSelectedObs((prev) => {
      if (oid in prev) {
        const { [oid]: _, ...rest } = prev;
        return rest;
      }
      const metrics = parseMetrics(obs.metrics);
      if (metrics.length === 0) {
        return { ...prev, [oid]: {} };
      }
      const initial: Record<string, number> = {};
      for (const m of metrics) {
        initial[m.id] = m.scaleMin;
      }
      return { ...prev, [oid]: initial };
    });
  };

  const isObsSelected = (id: string) => id in selectedObs;
  const isMedical = (id: string) => ["blood", "mucus"].includes(id);

  const handleSave = async () => {
    if (!event || !baby) return;
    setSaving(true);
    try {
      const obsWithScale: Record<string, Record<string, number>> = {};
      const allObsIds: string[] = [];
      for (const [oid, metrics] of Object.entries(selectedObs)) {
        allObsIds.push(oid);
        if (Object.keys(metrics).length > 0) {
          obsWithScale[oid] = metrics;
        }
      }

      const peeIntensityZone = findZone(peeIntensityCfg, peeIntensity);
      const poopIntensityZone = findZone(poopIntensityCfg, poopIntensity);
      const peeHealthZone = peeHealthCfg.enabled && peeHealth > 0 ? findZone(peeHealthCfg, peeHealth) : null;
      const poopHealthZone = poopHealthCfg.enabled && poopHealth > 0 ? findZone(poopHealthCfg, poopHealth) : null;
      const poopConsistencyZone = findZone(poopConsistencyCfg, poopConsistency);

      await updateEvent.mutateAsync({
        id: event.id,
        babyId: baby.id,
        timestamp: editTimestamp,
        notes: editNotes || null,
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

      setSavedMeta({
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
      } as Record<string, unknown>);

      setEditing(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar el pañal");
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

  if (!event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: c.textMuted }}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── VIEW MODE ───
  if (!editing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.card,
        }}>
          <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: c.textBody }}>
            🍑 Detalle de Pañal
          </Text>
          <TouchableOpacity onPress={() => setEditing(true)} style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" }}>
            <Text style={{ color: c.accent, fontWeight: "800", fontSize: 15 }}>✏️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* Info card */}
          <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12 }}>🕐 {formatDateTime(event.timestamp)}</Text>
              <Text style={{ color: isOwn ? c.success : c.accent, fontWeight: "700", fontSize: 12 }}>
                {isOwn ? "👤 Tú" : `👤 ${profile?.name ?? "Otro"}`}
              </Text>
            </View>
            {event.notes && (
              <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13, marginTop: 4 }}>
                📝 {event.notes}
              </Text>
            )}
          </View>

          {anyAlert && (
            <View style={{ backgroundColor: c.danger + "20", borderRadius: 20, padding: 16, gap: 8, borderWidth: 1, borderColor: c.danger }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 18 }}>🚨</Text>
                <Text style={{ color: c.danger, fontWeight: "900", fontSize: 15 }}>Se requiere atención médica</Text>
              </View>
              <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 12, lineHeight: 18 }}>
                Se detectaron los siguientes signos de alerta:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {peeHealthAlert && meta.peeHealthZone?.label && (
                  <View style={{ backgroundColor: c.danger + "30", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: c.danger, fontWeight: "800", fontSize: 12 }}>
                      💧 {meta.peeHealthZone.label}
                    </Text>
                  </View>
                )}
                {poopHealthAlert && meta.poopHealthZone?.label && (
                  <View style={{ backgroundColor: c.danger + "30", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: c.danger, fontWeight: "800", fontSize: 12 }}>
                      💩 {meta.poopHealthZone.label}
                    </Text>
                  </View>
                )}
                {poopConsistencyAlert && meta.poopConsistencyZone?.label && (
                  <View style={{ backgroundColor: c.danger + "30", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: c.danger, fontWeight: "800", fontSize: 12 }}>
                      💩 {meta.poopConsistencyZone.label}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ─── PIPÍ ─── */}
          {(meta.peeIntensity > 0 || (meta.peeHealth ?? 0) > 0) && (
            <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 10 }}>
              <Text style={{ color: c.growth, fontWeight: "800", fontSize: 15 }}>
                💧 Pipí
              </Text>
              {meta.peeIntensityZone?.label && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{meta.peeIntensityZone.emoji || "💧"}</Text>
                  <View>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11 }}>Cantidad</Text>
                    <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 16 }}>
                      {meta.peeIntensityZone.label}
                    </Text>
                  </View>
                </View>
              )}
              {meta.peeHealthZone?.label && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{meta.peeHealthZone.emoji || "🔬"}</Text>
                  <View>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11 }}>Color (pipímetro)</Text>
                    <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 16 }}>
                      {meta.peeHealthZone.label}
                    </Text>
                  </View>
                </View>
              )}
              {meta.peeHealthZone?.note && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.danger + "12", borderRadius: 10, padding: 8 }}>
                  <Text style={{ fontSize: 14 }}>🚨</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: "600", color: c.textBody, lineHeight: 16 }}>{meta.peeHealthZone.note}</Text>
                </View>
              )}
            </View>
          )}

          {/* ─── POPÓ ─── */}
          {(meta.poopIntensity > 0 || (meta.poopHealth ?? 0) > 0 || meta.poopConsistency > 0) && (
            <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 10 }}>
              <Text style={{ color: c.biological.poop, fontWeight: "800", fontSize: 15 }}>
                💩 Popó
              </Text>
              {meta.poopIntensityZone?.label && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{meta.poopIntensityZone.emoji || "💩"}</Text>
                  <View>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11 }}>Cantidad</Text>
                    <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 16 }}>
                      {meta.poopIntensityZone.label}
                    </Text>
                  </View>
                </View>
              )}
              {meta.poopConsistencyZone?.label && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{meta.poopConsistencyZone.emoji || "💩"}</Text>
                  <View>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11 }}>Consistencia</Text>
                    <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 16 }}>
                      {meta.poopConsistencyZone.label}
                    </Text>
                  </View>
                </View>
              )}
              {meta.poopConsistencyZone?.note && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.danger + "12", borderRadius: 10, padding: 8 }}>
                  <Text style={{ fontSize: 14 }}>🚨</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: "600", color: c.textBody, lineHeight: 16 }}>{meta.poopConsistencyZone.note}</Text>
                </View>
              )}
              {meta.poopHealthZone?.label && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{meta.poopHealthZone.emoji || "🎨"}</Text>
                  <View>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11 }}>Color (popómetro)</Text>
                    <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 16 }}>
                      {meta.poopHealthZone.label}
                    </Text>
                  </View>
                </View>
              )}
              {meta.poopHealthZone?.note && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.danger + "12", borderRadius: 10, padding: 8 }}>
                  <Text style={{ fontSize: 14 }}>🚨</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: "600", color: c.textBody, lineHeight: 16 }}>{meta.poopHealthZone.note}</Text>
                </View>
              )}
            </View>
          )}

          {/* ─── OBSERVACIONES ─── */}
          {meta.observationIds?.length > 0 && (
            <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 8 }}>
              <Text style={{ color: c.accent, fontWeight: "800", fontSize: 15 }}>
                🔬 Observaciones
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {(meta.observationIds as string[]).map((oid: string) => {
                  const obs = observations?.find((o) => o.id === oid);
                  const obsValue = meta.observationValues?.[oid];
                  const obsMetrics = obs ? parseMetrics(obs.metrics) : [];
                  let label = obs ? `${obs.emoji} ${obs.label}` : oid;
                  if (obsValue && obsMetrics.length > 0) {
                    const m = obsMetrics[0];
                    const v = obsValue[m.id];
                    if (v != null) {
                      const zone = m.zones?.find((z) => v >= z.min && v <= z.max);
                      if (zone) label = `${obs!.emoji} ${zone.label}`;
                    }
                  }
                  return (
                    <View key={oid} style={{
                      backgroundColor: c.surface,
                      borderRadius: 99,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    }}>
                      <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 12 }}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── PESO ─── */}
          {meta.weightGrams != null && (
            <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 24 }}>⚖️</Text>
              <View>
                <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11 }}>Peso del pañal</Text>
                <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 18 }}>{meta.weightGrams} g</Text>
              </View>
            </View>
          )}

          {/* ─── FOTO ─── */}
          {meta.imageUri && (
            <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 8 }}>
              <Text style={{ color: c.accent, fontWeight: "800", fontSize: 15 }}>📸 Foto</Text>
              <Image
                source={{ uri: meta.imageUri }}
                style={{ width: "100%", height: 240, borderRadius: 12 }}
                resizeMode="cover"
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── EDIT MODE ───
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderBottomColor: c.card,
      }}>
        <TouchableOpacity onPress={() => setEditing(false)} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: c.textBody }}>
          ✏️ Editar Pañal
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
        {/* Date/time editor */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
            🕐 Fecha y hora
          </Text>
          <DateTimePicker value={editTimestamp} onChange={setEditTimestamp} />
        </View>

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
          <ScaleMeter
            label="Consistencia"
            emoji="💩"
            value={poopConsistency}
            onChange={setPoopConsistency}
            min={poopConsistencyCfg.min}
            max={poopConsistencyCfg.max}
            zones={poopConsistencyCfg.zones}
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
        </View>

        {/* ─── OBSERVACIONES ─── */}
        {observations && observations.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: c.accent, fontWeight: "800", fontSize: 15 }}>
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
                      backgroundColor: selected ? (medical ? c.danger : c.accent) : c.card,
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
            {(poopConsistency === 4 || Object.keys(selectedObs).some((oid) => {
              const obs = observations?.find((o) => o.id === oid);
              if (!obs?.isAlert) return false;
              const metrics = parseMetrics(obs.metrics);
              if (!metrics.length) return true;
              if (oid === 'blood') return true;
              return metrics.some((m) => {
                const v = selectedObs[oid]?.[m.id];
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
            style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, color: c.textBody, fontSize: 18, fontWeight: "700" }}
          />
        </View>

        {/* ─── FOTO ─── */}
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

        {/* ─── NOTAS ─── */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>📝 Notas</Text>
          <TextInput
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Agregar nota..."
            placeholderTextColor={c.textMuted}
            multiline
            style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, color: c.textBody, fontSize: 15, minHeight: 60, textAlignVertical: "top" }}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{ backgroundColor: saving ? c.elevated : c.accent, paddingVertical: 16, borderRadius: 99, alignItems: "center" }}
        >
          <Text style={{ color: c.textBody, fontWeight: "900", fontSize: 16 }}>
            {saving ? "Guardando..." : "💾 Guardar Cambios"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}