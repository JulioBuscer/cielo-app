import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { useActiveProfile, useProfiles, useDeleteProfile } from "@/src/hooks/useProfile";
import { ROLES } from "@/src/constants/roles";

function RoleChip({ roleId }: { roleId: string }) {
  const role = ROLES.find(r => r.id === roleId);
  if (!role) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 16 }}>{role.emoji}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#FF5C9A" }}>{role.label}</Text>
    </View>
  );
}

export default function ProfilesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: profiles, isLoading } = useProfiles();
  const { data: activeProfile } = useActiveProfile();
  const deleteProfile = useDeleteProfile();

  const handleEdit = (id: string) => {
    if (id !== activeProfile?.id) return;
    router.push(`/settings/profile/${id}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (id !== activeProfile?.id) return;
    if ((profiles?.length ?? 0) <= 1) {
      Alert.alert("No se puede eliminar", "Debe haber al menos un perfil de cuidador.");
      return;
    }
    Alert.alert(
      "Eliminar perfil",
      `¿Eliminar a ${name}? Se marcará como eliminado y se ocultará.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const pid = activeProfile?.id ?? id;
              await deleteProfile.mutateAsync({ id, deletedBy: pid });
            } catch { }
          },
        },
      ]
    );
  };

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
          👤 Perfiles de Cuidadores
        </Text>
      </View>

      <ScrollView
        style={{ backgroundColor: c.surface, flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />
        ) : (
          profiles?.map((p) => {
            const isActive = activeProfile?.id === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => handleEdit(p.id)}
                onLongPress={() => isActive && handleDelete(p.id, p.name)}
                activeOpacity={isActive ? 0.7 : 1}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: c.card,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 2,
                  borderColor: isActive ? c.accent : c.elevated,
                }}
              >
                <Text style={{ fontSize: 28 }}>{ROLES.find(r => r.id === p.role)?.emoji ?? "👤"}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: c.textBody }}>
                      {p.name}
                    </Text>
                    {isActive && (
                      <View style={{
                        backgroundColor: c.accent + "33",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 99,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: c.accent }}>
                          ACTIVO
                        </Text>
                      </View>
                    )}
                  </View>
                  <RoleChip roleId={p.role} />
                </View>
                {isActive && <Text style={{ fontSize: 18, color: c.textMuted }}>›</Text>}
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          onPress={() => router.push("/settings/profile/new")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: c.card,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1.5,
            borderColor: c.accent + "4D",
            borderStyle: "dashed",
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 20, color: c.accent }}>+</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: c.accent }}>
            Agregar perfil
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
