import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { BigButton } from "@/src/components/ui/BigButton";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useSaveTimelineEvent } from "@/src/hooks/useTimeline";

const TEMP_PRESETS = [36.5, 37.0, 37.5, 38.0, 38.5, 39.0];

const COMMON_SYMPTOMS = [
  { id: "cough", emoji: "🗣️", label: "Tos" },
  { id: "congestion", emoji: "🤧", label: "Congestión" },
  { id: "diarrhea", emoji: "💩", label: "Diarrea" },
  { id: "vomiting", emoji: "🤮", label: "Vómito" },
  { id: "rash", emoji: "🔴", label: "Sarpullido" },
  { id: "fever", emoji: "🌡️", label: "Fiebre" },
  { id: "irritability", emoji: "😫", label: "Irritable" },
  { id: "lethargy", emoji: "😴", label: "Decaimiento" },
  { id: "poorAppetite", emoji: "😕", label: "Poco apetito" },
  { id: "runnyNose", emoji: "👃", label: "Mocos" },
  { id: "earPain", emoji: "👂", label: "Dolor oído" },
  { id: "other", emoji: "❓", label: "Otro" },
];

function monthsSince(date: Date | string): number {
  const bd = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  let m = (now.getFullYear() - bd.getFullYear()) * 12;
  m += now.getMonth() - bd.getMonth();
  if (now.getDate() < bd.getDate()) m--;
  return m;
}

export function TemperatureSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const saveEvent = useSaveTimelineEvent();

  const [timestamp, setTimestamp] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const [tempValue, setTempValue] = useState("36.5");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  const babyMonths = baby?.birthDate ? monthsSince(baby.birthDate) : 0;
  const tempNum = parseFloat(tempValue);
  const showFever = tempValue !== "" && !isNaN(tempNum);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (visible) {
      setTempValue("36.5");
      setSelectedSymptoms(new Set());
      setNotes("");
      setTimestamp(new Date());
    }
  }, [visible]);

  const handleSave = async () => {
    if (!baby) return;
    setSaving(true);
    try {
      const saved: string[] = [];
      const failed: string[] = [];

      await saveEvent.mutateAsync({
        babyId: baby.id,
        eventTypeId: "temperature",
        timestamp,
        values: { temperature: tempNum },
        metadata: { celsius: tempNum },
        notes: notes || undefined,
      });
      saved.push("🌡️ Temperatura");

      if (selectedSymptoms.size > 0) {
        const symptomText = [...selectedSymptoms]
          .map((id) => {
            const s = COMMON_SYMPTOMS.find((x) => x.id === id);
            return s ? `${s.emoji} ${s.label}` : id;
          })
          .join(", ");
        try {
          await saveEvent.mutateAsync({
            babyId: baby.id,
            eventTypeId: "note",
            timestamp,
            notes: [symptomText, notes].filter(Boolean).join(" · "),
          });
          saved.push("🤒 Síntomas");
        } catch {
          failed.push("🤒 Síntomas");
        }
      }

      if (failed.length > 0) {
        Alert.alert("Guardado parcial", `✅ ${saved.join(", ")}\n\n❌ Falló: ${failed.join(", ")}`);
      }
      onClose();
    } catch {
      Alert.alert("Error", "No se pudo guardar");
    } finally {
      setSaving(false);
    }
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
            contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 0 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 40 }}>🌡️</Text>
              <Text style={{ color: c.textBody, fontSize: 20, fontWeight: "800" }}>Temperatura</Text>
            </View>

            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={{
                width: 120, height: 120, borderRadius: 60,
                backgroundColor: showFever
                  ? tempNum >= 39 ? "#FFF7ED"
                    : tempNum >= 38 ? "#FEF9C3" : "#F0FDF4"
                  : c.card,
                alignItems: "center", justifyContent: "center",
                borderWidth: 3,
                borderColor: showFever
                  ? tempNum >= 39 ? "#F97316"
                    : tempNum >= 38 ? "#EAB308" : "#22C55E"
                  : c.textDim,
              }}>
                <Text style={{
                  fontSize: 32, fontWeight: "800",
                  color: showFever
                    ? tempNum >= 39 ? "#EA580C"
                      : tempNum >= 38 ? "#CA8A04" : "#16A34A"
                    : c.textMuted,
                }}>
                  {tempValue || "—"}
                </Text>
                <Text style={{ fontSize: 14, color: c.textMuted, fontWeight: "600" }}>°C</Text>
              </View>
              {showFever && tempNum >= 38 && (
                <View style={{ gap: 2, alignItems: "center" }}>
                  <Text style={{
                    fontWeight: "800", fontSize: 14,
                    color: tempNum >= 39 ? "#F97316" : tempNum >= 38 ? "#CA8A04" : "#16A34A",
                  }}>
                    {tempNum >= 39 ? "⚠️ Consulta con pediatra" : tempNum >= 38 ? "🌡️ Algo elevada" : "Normal 🫶"}
                  </Text>
                  {babyMonths < 3 && tempNum >= 38 && (
                    <Text style={{ color: "#F97316", fontSize: 11, textAlign: "center", lineHeight: 14 }}>
                      🫶 En menores de 3 meses, ≥ 38°C evaluar con pediatra
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {TEMP_PRESETS.map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setTempValue(String(v))}
                  style={{
                    paddingVertical: 8, paddingHorizontal: 16,
                    borderRadius: 99, backgroundColor: c.card,
                    borderWidth: 1,
                    borderColor: tempValue === String(v) ? "#F97316" : c.textDim + "40",
                    minHeight: 36,
                  }}
                >
                  <Text style={{
                    color: tempValue === String(v) ? "#F97316" : c.textMuted,
                    fontWeight: "700", fontSize: 14,
                  }}>{v}°</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={tempValue}
              onChangeText={(t) => setTempValue(t.replace(/[^0-9.]/g, ""))}
              placeholder="37.0"
              placeholderTextColor={c.textDim}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: c.card,
                borderRadius: 12, padding: 12,
                color: c.textBody, fontSize: 16,
                textAlign: "center",
              }}
            />

            <Text style={{ color: c.textDim, fontSize: 11, textAlign: "center", lineHeight: 15 }}>
              🫶 Se considera fiebre a partir de 38°C (vía axilar).
              {babyMonths < 3
                ? " En menores de 3 meses, cualquier ≥ 38°C merece consulta médica."
                : babyMonths < 12
                  ? " En lactantes la fiebre suele ser vírica y autolimitada."
                  : ""}
            </Text>

            {/* ─── Symptoms ─── */}
            <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 12 }}>
              <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 15 }}>🤒 Síntomas</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {COMMON_SYMPTOMS.map((s) => {
                  const active = selectedSymptoms.has(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => toggleSymptom(s.id)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99,
                        backgroundColor: active ? "#EC4899" : c.surface,
                        minHeight: 36,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{s.emoji}</Text>
                      <Text style={{ color: active ? "#FFF" : c.textBody, fontWeight: "700", fontSize: 13 }}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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

            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
        <View style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: c.surface }}>
          <BigButton
            title="Guardar 🌡️"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </View>
      </View>
    </Modal>
  );
}
