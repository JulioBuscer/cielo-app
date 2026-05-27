import { useState, useEffect, useMemo } from "react";
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
import {
  useSaveTimelineEvent,
  useEventTypes,
} from "@/src/hooks/useTimeline";

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

export function HealthSheet({
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
  const { data: allEventTypes } = useEventTypes();

  const customHealthTypes = useMemo(() => {
    if (!allEventTypes) return [];
    return allEventTypes.filter(
      (t) => t.category === "health" && t.id !== "temperature" && t.id !== "medication"
    );
  }, [allEventTypes]);

  const [timestamp, setTimestamp] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [tempValue, setTempValue] = useState("36.5");
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medUnit, setMedUnit] = useState<"mL" | "gotas" | "sobre">("mL");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});

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
      setMedName("");
      setMedDose("");
      setMedUnit("mL");
      setSelectedSymptoms(new Set());
      setNotes("");
      setCustomNotes({});
      setShowDetails(false);
      setTimestamp(new Date());
    }
  }, [visible]);

  const handleSave = async () => {
    if (!baby) return;
    const hasMed = medName.trim().length > 0;
    const hasSymptoms = selectedSymptoms.size > 0;
    const hasCustom = Object.values(customNotes).some(Boolean);
    if (!hasMed && !hasSymptoms && !hasCustom) {
      // Quick save: just temperature
    }
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

      if (hasMed) {
        try {
          await saveEvent.mutateAsync({
            babyId: baby.id,
            eventTypeId: "medication",
            timestamp,
            values: { dose: parseFloat(medDose) || 0, unit: medUnit },
            metadata: { medicineName: medName.trim(), dose: parseFloat(medDose) || 0, unit: medUnit },
            notes: notes || undefined,
          });
          saved.push("💊 Medicamento");
        } catch {
          failed.push("💊 Medicamento");
        }
      }

      if (hasSymptoms) {
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

      for (const et of customHealthTypes) {
        const note = customNotes[et.id]?.trim();
        if (note) {
          try {
            await saveEvent.mutateAsync({
              babyId: baby.id,
              eventTypeId: et.id,
              timestamp,
              notes: note,
            });
            saved.push(`${et.emoji} ${et.label}`);
          } catch {
            failed.push(`${et.emoji} ${et.label}`);
          }
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
              <Text style={{ color: c.textBody, fontSize: 20, fontWeight: "800" }}>Salud</Text>
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

            <TouchableOpacity
              onPress={() => setShowDetails(!showDetails)}
              style={{ alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={{ color: c.accentStrong, fontWeight: "700", fontSize: 15 }}>
                {showDetails ? "💊 Menos detalles ▴" : "💊 Más detalles ▾"}
              </Text>
            </TouchableOpacity>

            {showDetails && (
              <>
                <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 12 }}>
                  <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 15 }}>💊 Medicamento</Text>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                      Nombre
                    </Text>
                    <TextInput
                      value={medName}
                      onChangeText={setMedName}
                      placeholder="Ej: Paracetamol"
                      placeholderTextColor={c.textDim}
                      style={{ backgroundColor: c.surface, borderRadius: 12, padding: 12, color: c.textBody, fontSize: 15 }}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Dosis</Text>
                      <TextInput
                        value={medDose}
                        onChangeText={(t) => setMedDose(t.replace(/[^0-9.]/g, ""))}
                        placeholder="0"
                        placeholderTextColor={c.textDim}
                        keyboardType="decimal-pad"
                        style={{ backgroundColor: c.surface, borderRadius: 12, padding: 12, color: c.textBody, fontSize: 15 }}
                      />
                    </View>
                    <View style={{ gap: 4 }}>
                      <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>Unidad</Text>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        {(["mL", "gotas", "sobre"] as const).map((u) => (
                          <TouchableOpacity
                            key={u}
                            onPress={() => setMedUnit(u)}
                            style={{
                              paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
                              backgroundColor: medUnit === u ? "#6366F1" : c.surface,
                              minHeight: 40,
                            }}
                          >
                            <Text style={{
                              color: medUnit === u ? "#FFF" : c.textMuted,
                              fontWeight: "700", fontSize: 13,
                            }}>{u}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>

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

                {customHealthTypes.length > 0 && (
                  <View style={{ gap: 12 }}>
                    {customHealthTypes.map((et) => {
                      const val = customNotes[et.id] ?? "";
                      return (
                        <View key={et.id} style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 8 }}>
                          <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 15 }}>
                            {et.emoji} {et.label}
                          </Text>
                          <TextInput
                            value={val}
                            onChangeText={(t) => setCustomNotes((p) => ({ ...p, [et.id]: t }))}
                            placeholder={`Detalles sobre ${et.label.toLowerCase()}...`}
                            placeholderTextColor={c.textDim}
                            multiline
                            style={{
                              backgroundColor: c.surface, borderRadius: 12, padding: 12,
                              color: c.textBody, fontSize: 15, minHeight: 60, textAlignVertical: "top",
                            }}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}

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
        <View style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: c.surface }}>
          <BigButton
            title="Guardar Rápido 🌡️"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </View>
      </View>
    </Modal>
  );
}
