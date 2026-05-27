import { useState, useMemo } from "react";
import { useTheme } from "@/src/theme/useTheme";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby } from "@/src/hooks/useBaby";
import { useSaveTimelineEvent, useEventTypes } from "@/src/hooks/useTimeline";
import { DateTimePicker } from "@/src/components/ui/DateTimePicker";
import { BigButton } from "@/src/components/ui/BigButton";
import type { EventType } from "@/src/db/schema";

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

function FeverZone({ tempC, months }: { tempC: number; months: number }) {
  const isYoung = months < 3;
  const threshold = isYoung ? 38 : 38;

  let zone: { label: string; color: string };
  if (tempC < threshold) {
    zone = { label: "Normal 🫶", color: "#22C55E" };
  } else if (tempC < 39) {
    zone = { label: "Algo elevada", color: "#EAB308" };
  } else {
    zone = { label: "Consulta con pediatra", color: "#F97316" };
  }

  return (
    <View style={{ gap: 4, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: zone.color }} />
        <Text style={{ color: zone.color, fontWeight: "800", fontSize: 15 }}>{zone.label}</Text>
      </View>
      {tempC >= 38 && isYoung && (
        <Text style={{ color: "#F97316", fontSize: 12, textAlign: "center", lineHeight: 16 }}>
          🫶 En menores de 3 meses, cualquier temperatura ≥ 38°C debe ser evaluada por un pediatra
        </Text>
      )}
    </View>
  );
}

export default function HealthNewScreen() {
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

  const babyMonths = baby?.birthDate ? monthsSince(baby.birthDate) : 0;

  const [tempEnabled, setTempEnabled] = useState(false);
  const [temp, setTemp] = useState("");
  const [medEnabled, setMedEnabled] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medUnit, setMedUnit] = useState<"mL" | "gotas" | "sobre">("mL");
  const [symptomsEnabled, setSymptomsEnabled] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [customEnabled, setCustomEnabled] = useState<Record<string, boolean>>({});
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});

  const tempValue = parseFloat(temp);
  const showFever = tempEnabled && temp !== "" && !isNaN(tempValue);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!baby) return;
    const anyCustomOn = Object.values(customEnabled).some(Boolean);
    if (!tempEnabled && !medEnabled && !symptomsEnabled && !anyCustomOn) {
      Alert.alert("Nada que guardar", "Activa al menos una sección");
      return;
    }
    setSaving(true);
    try {
      const saved: string[] = [];
      const failed: string[] = [];

      if (tempEnabled && temp !== "") {
        try {
          await saveEvent.mutateAsync({
            babyId: baby.id,
            eventTypeId: "temperature",
            timestamp,
            values: { temperature: tempValue },
            metadata: { celsius: tempValue },
            notes: notes || undefined,
          });
          saved.push("🌡️ Temperatura");
        } catch {
          failed.push("🌡️ Temperatura");
        }
      }

      if (medEnabled && medName.trim()) {
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

      if (symptomsEnabled && selectedSymptoms.size > 0) {
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
        if (customEnabled[et.id]) {
          try {
            await saveEvent.mutateAsync({
              babyId: baby.id,
              eventTypeId: et.id,
              timestamp,
              notes: customNotes[et.id]?.trim() || undefined,
            });
            saved.push(`${et.emoji} ${et.label}`);
          } catch {
            failed.push(`${et.emoji} ${et.label}`);
          }
        }
      }

      if (failed.length === 0) {
        router.back();
      } else if (saved.length === 0) {
        Alert.alert("Error", "No se pudo guardar ningún registro");
      } else {
        Alert.alert(
          "Guardado parcial",
          `✅ ${saved.join(", ")}\n\n❌ Falló: ${failed.join(", ")}`
        );
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <StatusBar barStyle={parseInt(c.surface.replace("#","").slice(0,2),16) > 128 ? "dark-content" : "light-content"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 22 }}>🌡️</Text>
            <Text style={{ color: c.textBody, fontSize: 20, fontWeight: "800" }}>Salud</Text>
            <View style={{ flex: 1 }} />
            <DateTimePicker value={timestamp} onChange={setTimestamp} />
          </View>

          {/* ─── Temperature ─── */}
          <View style={{ backgroundColor: c.elevated, borderRadius: 16, padding: 16, gap: 12 }}>
            <TouchableOpacity
              onPress={() => setTempEnabled(!tempEnabled)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={{
                width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                borderColor: tempEnabled ? "#F97316" : c.textDim,
                backgroundColor: tempEnabled ? "#F97316" : "transparent",
                alignItems: "center", justifyContent: "center",
              }}>
                {tempEnabled && <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 18 }}>🌡️</Text>
              <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 15 }}>
                Temperatura
              </Text>
            </TouchableOpacity>

            {tempEnabled && (
              <View style={{ gap: 16, marginTop: 4 }}>
                {/* Big temp display */}
                <View style={{ alignItems: "center", gap: 4 }}>
                  <View style={{
                    width: 120, height: 120, borderRadius: 60,
                    backgroundColor: showFever
                      ? tempValue >= 39 ? "#FFF7ED"
                        : tempValue >= 38 ? "#FEF9C3" : "#F0FDF4"
                      : c.surface,
                    alignItems: "center", justifyContent: "center",
                    borderWidth: 3,
                    borderColor: showFever
                      ? tempValue >= 39 ? "#F97316"
                        : tempValue >= 38 ? "#EAB308" : "#22C55E"
                      : c.textDim,
                  }}>
                    <Text style={{
                      fontSize: 32, fontWeight: "800",
                      color: showFever
                        ? tempValue >= 39 ? "#EA580C"
                          : tempValue >= 38 ? "#CA8A04" : "#16A34A"
                        : c.textMuted,
                    }}>
                      {temp || "—"}
                    </Text>
                    <Text style={{ fontSize: 14, color: c.textMuted, fontWeight: "600" }}>°C</Text>
                  </View>
                  {showFever && <FeverZone tempC={tempValue} months={babyMonths} />}
                </View>

                {/* Preset buttons */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {TEMP_PRESETS.map((v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setTemp(String(v))}
                      style={{
                        paddingVertical: 8, paddingHorizontal: 16,
                        borderRadius: 99, backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: temp === String(v) ? "#F97316" : c.textDim + "40",
                        minHeight: 36,
                      }}
                    >
                      <Text style={{
                        color: temp === String(v) ? "#F97316" : c.textMuted,
                        fontWeight: "700", fontSize: 14,
                      }}>{v}°</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Manual input */}
                <View style={{ gap: 4 }}>
                  <TextInput
                    value={temp}
                    onChangeText={(t) => setTemp(t.replace(/[^0-9.]/g, ""))}
                    placeholder="37.0"
                    placeholderTextColor={c.textDim}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: 12, padding: 12,
                      color: c.textBody, fontSize: 16,
                      textAlign: "center",
                    }}
                  />
                </View>

                <Text style={{ color: c.textDim, fontSize: 12, textAlign: "center", lineHeight: 16 }}>
                  🫶 Los bebés suelen tener temperatura más alta que los adultos.
                  Se considera fiebre a partir de 38°C (vía axilar).
                  {babyMonths < 3
                    ? " En menores de 3 meses, cualquier ≥ 38°C merece consulta médica."
                    : babyMonths < 12
                      ? " En lactantes la fiebre suele ser vírica y autolimitada, confía en tu instinto."
                      : ""}
                </Text>
              </View>
            )}
          </View>

          {/* ─── Medication ─── */}
          <View style={{ backgroundColor: c.elevated, borderRadius: 16, padding: 16, gap: 12 }}>
            <TouchableOpacity
              onPress={() => setMedEnabled(!medEnabled)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={{
                width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                borderColor: medEnabled ? "#6366F1" : c.textDim,
                backgroundColor: medEnabled ? "#6366F1" : "transparent",
                alignItems: "center", justifyContent: "center",
              }}>
                {medEnabled && <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 18 }}>💊</Text>
              <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 15 }}>
                Medicamento
              </Text>
            </TouchableOpacity>

            {medEnabled && (
              <View style={{ gap: 12, marginTop: 4 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                    Nombre
                  </Text>
                  <TextInput
                    value={medName}
                    onChangeText={setMedName}
                    placeholder="Ej: Paracetamol, Ibuprofeno..."
                    placeholderTextColor={c.textDim}
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: 12, padding: 12,
                      color: c.textBody, fontSize: 15,
                    }}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                      Dosis
                    </Text>
                    <TextInput
                      value={medDose}
                      onChangeText={(t) => setMedDose(t.replace(/[^0-9.]/g, ""))}
                      placeholder="0"
                      placeholderTextColor={c.textDim}
                      keyboardType="decimal-pad"
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12, padding: 12,
                        color: c.textBody, fontSize: 15,
                      }}
                    />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                      Unidad
                    </Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {(["mL", "gotas", "sobre"] as const).map((u) => (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setMedUnit(u)}
                          style={{
                            paddingVertical: 10, paddingHorizontal: 14,
                            borderRadius: 10,
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
            )}
          </View>

          {/* ─── Symptoms ─── */}
          <View style={{ backgroundColor: c.elevated, borderRadius: 16, padding: 16, gap: 12 }}>
            <TouchableOpacity
              onPress={() => setSymptomsEnabled(!symptomsEnabled)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={{
                width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                borderColor: symptomsEnabled ? "#EC4899" : c.textDim,
                backgroundColor: symptomsEnabled ? "#EC4899" : "transparent",
                alignItems: "center", justifyContent: "center",
              }}>
                {symptomsEnabled && <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 18 }}>🤒</Text>
              <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 15 }}>
                Síntomas
              </Text>
            </TouchableOpacity>

            {symptomsEnabled && (
              <View style={{ gap: 12, marginTop: 4 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {COMMON_SYMPTOMS.map((s) => {
                    const active = selectedSymptoms.has(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => toggleSymptom(s.id)}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 4,
                          paddingVertical: 8, paddingHorizontal: 12,
                          borderRadius: 99,
                          backgroundColor: active ? "#EC4899" : c.surface,
                          minHeight: 36,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>{s.emoji}</Text>
                        <Text style={{
                          color: active ? "#FFF" : c.textBody,
                          fontWeight: "700", fontSize: 13,
                        }}>{s.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                    Notas adicionales
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Describe los síntomas..."
                    placeholderTextColor={c.textDim}
                    multiline
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: 12, padding: 12,
                      color: c.textBody, fontSize: 15,
                      minHeight: 80, textAlignVertical: "top",
                    }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* ─── Custom health types (from catalog) ─── */}
          {customHealthTypes.map((et) => {
            const enabled = customEnabled[et.id] ?? false;
            return (
              <View key={et.id} style={{ backgroundColor: c.elevated, borderRadius: 16, padding: 16, gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setCustomEnabled((p) => ({ ...p, [et.id]: !(p[et.id] ?? false) }))}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={{
                    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                    borderColor: enabled ? "#8B5CF6" : c.textDim,
                    backgroundColor: enabled ? "#8B5CF6" : "transparent",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {enabled && <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 18 }}>{et.emoji}</Text>
                  <Text style={{ color: c.textBody, fontWeight: "700", fontSize: 15 }}>
                    {et.label}
                  </Text>
                </TouchableOpacity>

                {enabled && (
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <TextInput
                      value={customNotes[et.id] ?? ""}
                      onChangeText={(t) => setCustomNotes((p) => ({ ...p, [et.id]: t }))}
                      placeholder={`Detalles sobre ${et.label.toLowerCase()}...`}
                      placeholderTextColor={c.textDim}
                      multiline
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12, padding: 12,
                        color: c.textBody, fontSize: 15,
                        minHeight: 80, textAlignVertical: "top",
                      }}
                    />
                  </View>
                )}
              </View>
            );
          })}

          {/* Save */}
          <BigButton
            title="Guardar"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !baby}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
