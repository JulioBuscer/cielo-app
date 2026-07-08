import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { useActiveProfile, useProfiles, useCreateProfile, useUpdateProfile } from "@/src/hooks/useProfile";
import { ROLES } from "@/src/constants/roles";
import type { Role } from "@/src/constants/roles";

export default function ProfileEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: profiles, isLoading } = useProfiles();
  const { data: activeProfile } = useActiveProfile();
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();

  const existing = !isNew ? profiles?.find(p => p.id === id) : undefined;
  const isOwner = !isNew && id === activeProfile?.id;

  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState<Role>(existing?.role as Role ?? "mama");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setRole(existing.role as Role);
    }
  }, [existing]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Campo requerido", "El nombre del cuidador es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await createProfile.mutateAsync({ name: trimmed, role });
      } else if (isOwner && id) {
        await updateProfile.mutateAsync({ id, name: trimmed, role });
      }
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={["top"]}>
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const canEdit = isNew || isOwner;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      <View style={{
        backgroundColor: c.headerBg,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 16, minWidth: 44, minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: c.headerText, fontSize: 26, lineHeight: 28 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.headerText, fontWeight: "900", fontSize: 18, flex: 1 }}>
          {isNew ? "👤 Nuevo perfil" : canEdit ? "✏️ Editar perfil" : "👤 Perfil"}
        </Text>
      </View>

      <ScrollView
        style={{ backgroundColor: c.surface, flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
      >
        <Text style={{ fontSize: 12, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Nombre
        </Text>
        <TextInput
          value={name}
          onChangeText={canEdit ? setName : undefined}
          editable={canEdit}
          placeholder="Nombre del cuidador"
          placeholderTextColor={c.textDim}
          style={{
            backgroundColor: c.card,
            borderRadius: 12,
            padding: 14,
            color: c.textBody,
            fontSize: 16,
            opacity: canEdit ? 1 : 0.7,
          }}
        />

        <Text style={{ fontSize: 12, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Rol
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ROLES.map((r) => {
            const isSelected = role === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                onPress={canEdit ? () => setRole(r.id) : undefined}
                activeOpacity={canEdit ? 0.7 : 1}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 99,
                  borderWidth: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: isSelected ? c.accent + "1A" : c.card,
                  borderColor: isSelected ? c.accent : c.elevated,
                  opacity: canEdit ? 1 : 0.7,
                }}
              >
                <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                <Text style={{
                  fontSize: 14,
                  fontWeight: isSelected ? "700" : "600",
                  color: isSelected ? c.accent : c.textMuted,
                }}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!canEdit && existing && (
          <View style={{
            backgroundColor: c.card,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: c.elevated,
            marginTop: 4,
          }}>
            <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center" }}>
              Este perfil pertenece a otro cuidador. Solo puedes editar tu perfil activo.
            </Text>
          </View>
        )}

        {canEdit && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: c.accent,
              borderRadius: 14,
              padding: 16,
              alignItems: "center",
              opacity: saving ? 0.6 : 1,
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "800" }}>
              {saving ? "Guardando…" : "Guardar perfil"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
