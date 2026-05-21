import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BigButton } from "@/src/components/ui/BigButton";
import {
  useEventTypes,
  useDiaperObservations,
  useCreateEventType,
  useCreateDiaperObservation,
  useUpdateDiaperObservation,
} from "@/src/hooks/useTimeline";
import { getDb } from "@/src/db/client";
import { eventTypes, diaperObservations } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeContext } from "@/src/hooks/useTheme";
import type { DiaperObservation, ObservationMetric, ObservationZone } from "@/src/db/schema";
import { generateId } from "@/src/utils/id";

const COLORS = ["#4CAF50", "#FFC107", "#FF9800", "#F44336", "#9C27B0", "#2196F3"];
type Zone = { min: number; max: number; color: string; label: string; emoji?: string };

function ZoneEditor({
  zones,
  onChange,
  showEmoji,
}: {
  zones: Zone[];
  onChange: (z: Zone[]) => void;
  showEmoji?: boolean;
}) {
  const add = () => {
    const prevMax = zones.length > 0 ? zones[zones.length - 1].max : 0;
    onChange([
      ...zones,
      { min: prevMax + 1, max: prevMax + 2, color: "#888", label: "" },
    ]);
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 12 }}>
        Zonas de color
      </Text>
      {zones.map((z, i) => (
        <View
          key={i}
          style={{
            backgroundColor: "#1A1A2E",
            borderRadius: 10,
            padding: 10,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={String(z.min)}
              onChangeText={(v) => {
                const n = parseInt(v) || 1;
                const copy = [...zones];
                copy[i] = { ...copy[i], min: n };
                onChange(copy);
              }}
              keyboardType="number-pad"
              style={{
                backgroundColor: "#2A2A3E",
                borderRadius: 8,
                padding: 6,
                color: "#FFF",
                fontSize: 13,
                width: 40,
                textAlign: "center",
              }}
            />
            <Text style={{ color: "#888" }}>→</Text>
            <TextInput
              value={String(z.max)}
              onChangeText={(v) => {
                const n = parseInt(v) || 1;
                const copy = [...zones];
                copy[i] = { ...copy[i], max: n };
                onChange(copy);
              }}
              keyboardType="number-pad"
              style={{
                backgroundColor: "#2A2A3E",
                borderRadius: 8,
                padding: 6,
                color: "#FFF",
                fontSize: 13,
                width: 40,
                textAlign: "center",
              }}
            />
            <View style={{ flexDirection: "row", gap: 4, flex: 1 }}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    const copy = [...zones];
                    copy[i] = { ...copy[i], color: c };
                    onChange(copy);
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: c,
                    borderWidth: z.color === c ? 2 : 0,
                    borderColor: "#FFF",
                  }}
                />
              ))}
            </View>
            <TouchableOpacity
              onPress={() => onChange(zones.filter((_, j) => j !== i))}
            >
              <Text style={{ color: "#F44336", fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={z.label}
            onChangeText={(v) => {
              const copy = [...zones];
              copy[i] = { ...copy[i], label: v };
              onChange(copy);
            }}
            placeholder="Etiqueta (ej: Leve)"
            placeholderTextColor="#666"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 8,
              padding: 6,
              color: "#FFF",
              fontSize: 12,
              flex: showEmoji ? undefined : 1,
            }}
          />
          {showEmoji && (
            <TextInput
              value={z.emoji ?? ""}
              onChangeText={(v) => {
                const copy = [...zones];
                copy[i] = { ...copy[i], emoji: v };
                onChange(copy);
              }}
              placeholder="🩸"
              maxLength={2}
              style={{
                backgroundColor: "#2A2A3E",
                borderRadius: 8,
                padding: 6,
                color: "#FFF",
                fontSize: 14,
                width: 38,
                textAlign: "center",
              }}
            />
          )}
        </View>
      ))}
      <TouchableOpacity
        onPress={add}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 99,
          backgroundColor: "#2A2A3E",
        }}
      >
        <Text style={{ color: "#FF8AB3", fontWeight: "700", fontSize: 12 }}>
          + Añadir zona
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ObservationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DiaperObservation;
  onSave: (data: {
    emoji: string;
    label: string;
    isAlert: boolean;
    metrics: string;
  }) => void;
  onCancel: () => void;
}) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [isAlert, setIsAlert] = useState(initial?.isAlert ?? false);
  const [metrics, setMetrics] = useState<ObservationMetric[]>(
    initial?.metrics ? JSON.parse(initial.metrics) : []
  );

  const isValid = emoji.trim() && label.trim();

  const addMetric = () => {
    setMetrics((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        scaleMin: 1,
        scaleMax: 10,
        zones: [],
      },
    ]);
  };

  const removeMetric = (idx: number) => {
    setMetrics((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMetric = (idx: number, upd: Partial<ObservationMetric>) => {
    setMetrics((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...upd };
      return copy;
    });
  };

  const updateMetricZones = (idx: number, zones: Zone[]) => {
    setMetrics((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], zones: zones as ObservationZone[] };
      return copy;
    });
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      emoji: emoji.trim(),
      label: label.trim(),
      isAlert,
      metrics: JSON.stringify(metrics),
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontWeight: "900",
          fontSize: 18,
          textAlign: "center",
        }}
      >
        {initial ? "✏️ Editar observación" : "➕ Nueva observación"}
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 60 }}>
          <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
            EMOJI
          </Text>
          <TextInput
            value={emoji}
            onChangeText={setEmoji}
            placeholder="✨"
            maxLength={2}
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 12,
              fontSize: 20,
              textAlign: "center",
              color: "#FFF",
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
            NOMBRE
          </Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Ej. Sangre"
            placeholderTextColor="#666"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 12,
              fontSize: 15,
              color: "#FFF",
            }}
          />
        </View>
      </View>

      {/* Alert toggle */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
          🚨 Es alerta médica
        </Text>
        <TouchableOpacity
          onPress={() => setIsAlert(!isAlert)}
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor: isAlert ? "#F44336" : "#3A3A4E",
            padding: 3,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#FFF",
              alignSelf: isAlert ? "flex-end" : "flex-start",
            }}
          />
        </TouchableOpacity>
      </View>

      {/* Metrics */}
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
            📊 Métricas (escalas)
          </Text>
          <TouchableOpacity
            onPress={addMetric}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: "#FF8AB3",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12 }}>
              + Añadir
            </Text>
          </TouchableOpacity>
        </View>

        {metrics.length === 0 && (
          <Text style={{ color: "#666", fontSize: 13 }}>
            Sin escala — solo se mostrará como tag
          </Text>
        )}

        {metrics.map((m, idx) => (
          <View
            key={m.id}
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 12,
              padding: 14,
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <TextInput
                value={m.name}
                onChangeText={(v) => updateMetric(idx, { name: v })}
                placeholder="Nombre (ej: Intensidad)"
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#1A1A2E",
                  borderRadius: 8,
                  padding: 8,
                  color: "#FFF",
                  fontSize: 13,
                  flex: 1,
                  marginRight: 8,
                }}
              />
              <TouchableOpacity onPress={() => removeMetric(idx)}>
                <Text style={{ color: "#F44336", fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
                  Min
                </Text>
                <TextInput
                  value={String(m.scaleMin)}
                  onChangeText={(v) =>
                    updateMetric(idx, { scaleMin: parseInt(v) || 1 })
                  }
                  keyboardType="number-pad"
                  style={{
                    backgroundColor: "#1A1A2E",
                    borderRadius: 8,
                    padding: 8,
                    color: "#FFF",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#888", fontWeight: "700", fontSize: 11 }}>
                  Max
                </Text>
                <TextInput
                  value={String(m.scaleMax)}
                  onChangeText={(v) =>
                    updateMetric(idx, { scaleMax: parseInt(v) || 1 })
                  }
                  keyboardType="number-pad"
                  style={{
                    backgroundColor: "#1A1A2E",
                    borderRadius: 8,
                    padding: 8,
                    color: "#FFF",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                />
              </View>
            </View>

            <ZoneEditor
              zones={m.zones as Zone[]}
              onChange={(z) => updateMetricZones(idx, z)}
              showEmoji
            />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <TouchableOpacity
          onPress={onCancel}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 99,
            backgroundColor: "#2A2A3E",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#888", fontWeight: "700", fontSize: 14 }}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid}
          style={{
            flex: 2,
            paddingVertical: 12,
            borderRadius: 99,
            backgroundColor: isValid ? "#FF8AB3" : "#3A3A4E",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontWeight: "800",
              fontSize: 14,
            }}
          >
            {initial ? "💾 Guardar" : "➕ Crear"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

type ConfigRange = { min: number; max: number };
type HealthConfig = { enabled: boolean; min: number; max: number; zones: Zone[] };

function IntensitySection({
  label,
  emoji,
  config,
  onChange,
}: {
  label: string;
  emoji: string;
  config: ConfigRange & { zones: Zone[] };
  onChange: (c: ConfigRange & { zones: Zone[] }) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 12 }}>
        {emoji} Rango de intensidad
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextInput
            value={String(config.min)}
            onChangeText={(v) => onChange({ ...config, min: parseInt(v) || 0 })}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#666"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 8,
              padding: 8,
              color: "#FFF",
              fontSize: 14,
              textAlign: "center",
            }}
          />
        </View>
        <Text style={{ color: "#888", alignSelf: "center" }}>→</Text>
        <View style={{ flex: 1 }}>
          <TextInput
            value={String(config.max)}
            onChangeText={(v) => onChange({ ...config, max: parseInt(v) || 5 })}
            keyboardType="number-pad"
            placeholder="5"
            placeholderTextColor="#666"
            style={{
              backgroundColor: "#2A2A3E",
              borderRadius: 8,
              padding: 8,
              color: "#FFF",
              fontSize: 14,
              textAlign: "center",
            }}
          />
        </View>
      </View>
      <ZoneEditor zones={config.zones} onChange={(z) => onChange({ ...config, zones: z })} />
    </View>
  );
}

function HealthSection({
  label,
  emoji,
  config,
  onChange,
}: {
  label: string;
  emoji: string;
  config: HealthConfig;
  onChange: (c: HealthConfig) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "#BBBBBB", fontWeight: "700", fontSize: 13 }}>
          {emoji} {label}
        </Text>
        <TouchableOpacity
          onPress={() =>
            onChange({
              ...config,
              enabled: !config.enabled,
              zones: config.enabled ? config.zones : [],
            })
          }
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor: config.enabled ? "#4CAF50" : "#3A3A4E",
            padding: 3,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#FFF",
              alignSelf: config.enabled ? "flex-end" : "flex-start",
            }}
          />
        </TouchableOpacity>
      </View>

      {config.enabled && (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={String(config.min)}
                onChangeText={(v) =>
                  onChange({ ...config, min: parseInt(v) || 1 })
                }
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#2A2A3E",
                  borderRadius: 8,
                  padding: 8,
                  color: "#FFF",
                  fontSize: 14,
                  textAlign: "center",
                }}
              />
            </View>
            <Text style={{ color: "#888", alignSelf: "center" }}>→</Text>
            <View style={{ flex: 1 }}>
              <TextInput
                value={String(config.max)}
                onChangeText={(v) =>
                  onChange({ ...config, max: parseInt(v) || 8 })
                }
                keyboardType="number-pad"
                placeholder="8"
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#2A2A3E",
                  borderRadius: 8,
                  padding: 8,
                  color: "#FFF",
                  fontSize: 14,
                  textAlign: "center",
                }}
              />
            </View>
          </View>
          <ZoneEditor
            zones={config.zones}
            onChange={(z) => onChange({ ...config, zones: z })}
            showEmoji
          />
        </>
      )}
    </View>
  );
}

function PeeConfigSection({
  intensity,
  setIntensity,
  health,
  setHealth,
}: {
  intensity: ConfigRange & { zones: Zone[] };
  setIntensity: (c: ConfigRange & { zones: Zone[] }) => void;
  health: HealthConfig;
  setHealth: (c: HealthConfig) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        gap: 16,
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 15, color: "#2D1B26" }}>
        💧 Pipí
      </Text>
      <IntensitySection
        label="Intensidad"
        emoji="💧"
        config={intensity}
        onChange={setIntensity}
      />
      <View style={{ height: 1, backgroundColor: "#FFF0F5" }} />
      <HealthSection
        label="Pipímetro (color de orina)"
        emoji="🔬"
        config={health}
        onChange={setHealth}
      />
    </View>
  );
}

function PoopConfigSection({
  intensity,
  setIntensity,
  health,
  setHealth,
}: {
  intensity: ConfigRange & { zones: Zone[] };
  setIntensity: (c: ConfigRange & { zones: Zone[] }) => void;
  health: HealthConfig;
  setHealth: (c: HealthConfig) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        gap: 16,
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 15, color: "#2D1B26" }}>
        💩 Popó
      </Text>
      <IntensitySection
        label="Intensidad"
        emoji="💩"
        config={intensity}
        onChange={setIntensity}
      />
      <View style={{ height: 1, backgroundColor: "#FFF0F5" }} />
      <HealthSection
        label="Popómetro (color de heces)"
        emoji="🔬"
        config={health}
        onChange={setHealth}
      />
    </View>
  );
}

function ThemeToggle() {
  const { mode, isDark, setMode } = useThemeContext();
  return (
    <View
      className="flex-row items-center justify-center bg-headerBg dark:bg-surface-dark pb-2"
      style={{ gap: 8 }}
    >
      {(["system", "light", "dark"] as const).map((m) => {
        const active = mode === m;
        const label = m === "system" ? "📱 Auto" : m === "light" ? "☀️ Claro" : "🌙 Oscuro";
        return (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: active ? "rgba(255,255,255,0.3)" : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? "#FFFFFF" : "rgba(255,255,255,0.7)",
                fontWeight: active ? "800" : "600",
                fontSize: 13,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CatalogsScreen() {
  const { data: events } = useEventTypes();
  const { data: diaperObs } = useDiaperObservations();
  const createEvent = useCreateEventType();
  const createDiaper = useCreateDiaperObservation();
  const updateDiaper = useUpdateDiaperObservation();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"events" | "pee" | "poop" | "obs">("events");
  const [showForm, setShowForm] = useState(false);
  const [editingObs, setEditingObs] = useState<DiaperObservation | null>(null);

  // ─── Pee config ───
  const [peeIntensity, setPeeIntensity] = useState<ConfigRange & { zones: Zone[] }>({
    min: 1, max: 8,
    zones: [
      { min: 1, max: 3, color: "#4CAF50", label: "Saludable" },
      { min: 4, max: 6, color: "#FFC107", label: "Precaución" },
      { min: 7, max: 8, color: "#F44336", label: "Alerta" },
    ],
  });
  const [peeHealth, setPeeHealth] = useState<HealthConfig>({
    enabled: false,
    min: 1, max: 8,
    zones: [
      { min: 1, max: 2, color: "#4CAF50", label: "Transparente", emoji: "💧" },
      { min: 3, max: 4, color: "#8BC34A", label: "Claro", emoji: "💦" },
      { min: 5, max: 6, color: "#FFC107", label: "Amarillo", emoji: "🟡" },
      { min: 7, max: 8, color: "#F44336", label: "Oscuro", emoji: "🟠" },
    ],
  });

  // ─── Poop config ───
  const [poopIntensity, setPoopIntensity] = useState<ConfigRange & { zones: Zone[] }>({
    min: 0, max: 5,
    zones: [
      { min: 1, max: 2, color: "#8B4513", label: "Poco" },
      { min: 3, max: 4, color: "#654321", label: "Normal" },
      { min: 5, max: 5, color: "#3E2723", label: "Mucho" },
    ],
  });
  const [poopHealth, setPoopHealth] = useState<HealthConfig>({
    enabled: false,
    min: 1, max: 8,
    zones: [
      { min: 1, max: 2, color: "#8BC34A", label: "Verde", emoji: "🟢" },
      { min: 3, max: 4, color: "#FFC107", label: "Amarillo", emoji: "🟡" },
      { min: 5, max: 6, color: "#8B4513", label: "Marrón", emoji: "🟤" },
      { min: 7, max: 8, color: "#3E2723", label: "Oscuro", emoji: "⚫" },
    ],
  });

  // Load configs from AsyncStorage
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('pee_intensity_config'),
      AsyncStorage.getItem('pee_health_config'),
      AsyncStorage.getItem('poop_intensity_config'),
      AsyncStorage.getItem('poop_health_config'),
    ]).then(([pi, ph, poi, poh]) => {
      if (pi) try { setPeeIntensity(JSON.parse(pi)); } catch {}
      if (ph) try { setPeeHealth(JSON.parse(ph)); } catch {}
      if (poi) try { setPoopIntensity(JSON.parse(poi)); } catch {}
      if (poh) try { setPoopHealth(JSON.parse(poh)); } catch {}
    });
  }, []);

  const saveAllConfigs = () => {
    AsyncStorage.multiSet([
      ['pee_intensity_config', JSON.stringify(peeIntensity)],
      ['pee_health_config', JSON.stringify(peeHealth)],
      ['poop_intensity_config', JSON.stringify(poopIntensity)],
      ['poop_health_config', JSON.stringify(poopHealth)],
    ]);
    Alert.alert("✅ Listo", "Configuración guardada");
  };

  // Form states for events tab
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("other");

  const isEventFormValid = emoji.trim() && label.trim();

  const handleSaveEvent = () => {
    if (!isEventFormValid) return;
    createEvent.mutate(
      { emoji: emoji.trim(), label: label.trim(), category },
      {
        onSuccess: () => {
          setEmoji("");
          setLabel("");
          setCategory("other");
        },
      }
    );
  };

  const handleDeleteEvent = async (id: string, isSystem: boolean | null) => {
    if (isSystem)
      return Alert.alert("Ups", "No puedes borrar un tipo del sistema.");
    Alert.alert("Confirmar", "¿Borrar este tipo de evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await getDb().delete(eventTypes).where(eq(eventTypes.id, id));
          qc.invalidateQueries({ queryKey: ["event_types"] });
        },
      },
    ]);
  };

  const handleDeleteDiaper = async (id: string, isSystem: boolean | null) => {
    if (isSystem)
      return Alert.alert(
        "Ups",
        "No puedes borrar una observación del sistema."
      );
    Alert.alert("Confirmar", "¿Borrar esta observación?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await getDb()
            .delete(diaperObservations)
            .where(eq(diaperObservations.id, id));
          qc.invalidateQueries({ queryKey: ["diaper_observations"] });
        },
      },
    ]);
  };

  const handleObservationSave = (data: {
    emoji: string;
    label: string;
    isAlert: boolean;
    metrics: string;
  }) => {
    if (editingObs) {
      updateDiaper.mutate(
        { id: editingObs.id, ...data },
        { onSuccess: () => setEditingObs(null) }
      );
    } else {
      createDiaper.mutate(data, { onSuccess: () => setShowForm(false) });
    }
  };

  return (
    <SafeAreaView className="bg-headerBg dark:bg-surface-dark" style={{ flex: 1 }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />
      <View
        className="flex-row items-center px-4"
        style={{ padding: 16 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 16 }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 26, lineHeight: 28 }}>
            ←
          </Text>
        </TouchableOpacity>
        <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 18 }}>
          🛠️ Personalizar
        </Text>
      </View>

      {/* Theme toggle */}
      <ThemeToggle />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ─── Tabs ─── */}
        <View
          className="flex-row bg-headerBg dark:bg-surface-dark px-4"
        >
          {[
            { key: "events" as const, label: "📝 Eventos" },
            { key: "pee" as const, label: "💧 Pipí" },
            { key: "poop" as const, label: "💩 Popó" },
            { key: "obs" as const, label: "🧷 Obs. Pañal" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 3,
                borderBottomColor:
                  activeTab === t.key ? "#FFFFFF" : "transparent",
              }}
              onPress={() => setActiveTab(t.key)}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "800",
                  color:
                    activeTab === t.key
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.6)",
                  fontSize: 10,
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {showForm || editingObs ? (
          <View
            style={{
              flex: 1,
              backgroundColor: "#1A1A2E",
            }}
          >
            <ObservationForm
              initial={editingObs ?? undefined}
              onSave={handleObservationSave}
              onCancel={() => {
                setShowForm(false);
                setEditingObs(null);
              }}
            />
          </View>
        ) : (
          <ScrollView
            className="bg-surface dark:bg-surface-dark flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Events Tab ─── */}
            {activeTab === "events" && (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    fontSize: 13,
                    color: "#9B7A88",
                    marginBottom: 12,
                    textTransform: "uppercase",
                  }}
                >
                  Añadir nuevo evento
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <View style={{ width: 60 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: "#9B7A88",
                        marginBottom: 4,
                      }}
                    >
                      EMOJI
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: "#FFF0F5",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 20,
                        textAlign: "center",
                        color: "#2D1B26",
                      }}
                      placeholder="✨"
                      maxLength={2}
                      value={emoji}
                      onChangeText={setEmoji}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: "#9B7A88",
                        marginBottom: 4,
                      }}
                    >
                      NOMBRE
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: "#FFF0F5",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 15,
                        color: "#2D1B26",
                      }}
                      placeholder="Ej. Baño"
                      value={label}
                      onChangeText={setLabel}
                    />
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#9B7A88",
                      marginBottom: 4,
                    }}
                  >
                    CATEGORÍA
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {["health", "growth", "other"].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 99,
                          borderWidth: 1.5,
                          backgroundColor:
                            category === cat ? "#FFE4EE" : "#FFF0F5",
                          borderColor:
                            category === cat ? "#FF5C9A" : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color:
                              category === cat ? "#FF5C9A" : "#9B7A88",
                            textTransform: "capitalize",
                          }}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <BigButton
                  label={`Añadir Evento`}
                  disabled={
                    !isEventFormValid || createEvent.isPending
                  }
                  onPress={handleSaveEvent}
                />

                <View style={{ marginTop: 20, gap: 8 }}>
                  {events?.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: "#FFF0F5",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                        <View>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: "800",
                              color: "#2D1B26",
                            }}
                          >
                            {item.label}
                          </Text>
                          {!!item.isSystem && (
                            <Text
                              style={{
                                fontSize: 10,
                                color: "#FF5C9A",
                                fontWeight: "800",
                              }}
                            >
                              SISTEMA
                            </Text>
                          )}
                        </View>
                      </View>
                      {!item.isSystem && (
                        <TouchableOpacity
                          onPress={() =>
                            handleDeleteEvent(item.id, item.isSystem)
                          }
                        >
                          <Text style={{ color: "#EF4444", fontSize: 18 }}>
                            🗑️
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ─── Pee Tab ─── */}
            {activeTab === "pee" && (
              <PeeConfigSection
                intensity={peeIntensity}
                setIntensity={setPeeIntensity}
                health={peeHealth}
                setHealth={setPeeHealth}
              />
            )}

            {/* ─── Poop Tab ─── */}
            {activeTab === "poop" && (
              <PoopConfigSection
                intensity={poopIntensity}
                setIntensity={setPoopIntensity}
                health={poopHealth}
                setHealth={setPoopHealth}
              />
            )}

            {/* ─── Observations Tab ─── */}
            {activeTab === "obs" && (
              <>
                {/* Observations list */}
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "800",
                        fontSize: 13,
                        color: "#9B7A88",
                        textTransform: "uppercase",
                      }}
                    >
                      Observaciones ({diaperObs?.length || 0})
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowForm(true)}
                      style={{
                        backgroundColor: "#FF8AB3",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 99,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFF",
                          fontWeight: "800",
                          fontSize: 12,
                        }}
                      >
                        + Nueva
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ gap: 8 }}>
                    {diaperObs?.map((item) => {
                      const parsedMetrics: ObservationMetric[] = item.metrics
                        ? JSON.parse(item.metrics)
                        : [];
                      const hasMetrics = parsedMetrics.length > 0;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setEditingObs(item)}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: "#FFF0F5",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                              flex: 1,
                            }}
                          >
                            <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 15,
                                  fontWeight: "800",
                                  color: "#2D1B26",
                                }}
                              >
                                {item.label}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "#9B7A88",
                                  fontWeight: "600",
                                }}
                              >
                                {hasMetrics
                                  ? `${parsedMetrics.length} métrica(s)`
                                  : "Tag simple"}
                              </Text>
                            </View>
                            <Text style={{ color: "#9B7A88", fontSize: 14 }}>
                              ✏️
                            </Text>
                          </View>
                          {!item.isSystem && (
                            <TouchableOpacity
                              onPress={() =>
                                handleDeleteDiaper(item.id, item.isSystem)
                              }
                            >
                              <Text style={{ color: "#EF4444", fontSize: 18 }}>
                                🗑️
                              </Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Save button */}
                <BigButton label="💾 Guardar todo" onPress={saveAllConfigs} />
              </>
            )}

            {activeTab !== "obs" && (
              <View style={{ marginTop: 12 }}>
                <BigButton label="💾 Guardar configuración" onPress={saveAllConfigs} />
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
