import { View, Text, ScrollView, TouchableOpacity, Alert, StatusBar } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBabies, useActiveBaby, useSetActiveBaby, useDeleteBaby, calcAge, STATUS_LABELS, SEX_LABELS } from "@/src/hooks/useBaby";
import { useTheme } from "@/src/theme/useTheme";
import { getCachedDeviceId } from "@/src/sync/device";

export default function BabiesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: babiesList } = useBabies();
  const { data: activeBaby } = useActiveBaby();
  const setActiveBaby = useSetActiveBaby();
  const deleteBaby = useDeleteBaby();
  const localDeviceId = getCachedDeviceId();

  const handleSwitch = (id: string) => {
    setActiveBaby.mutate(id);
  };

  const handleDelete = (baby: typeof activeBaby) => {
    if (!baby) return;
    Alert.alert(
      `Eliminar a ${baby.nickname || baby.name}`,
      "Todos los registros de este bebé se eliminarán. ¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteBaby.mutate(baby.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>👶 Mis bebés</Text>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/baby")}
            style={{
              backgroundColor: c.accent, borderRadius: 99,
              paddingHorizontal: 16, paddingVertical: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>+ Nuevo</Text>
          </TouchableOpacity>
        </View>

        {(!babiesList || babiesList.length === 0) && (
          <View style={{ padding: 40, alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 48 }}>👶</Text>
            <Text style={{ fontSize: 15, color: c.textMuted, fontWeight: "600", textAlign: "center" }}>
              Aún no hay bebés registrados
            </Text>
          </View>
        )}

        {babiesList?.map((baby) => {
          const isActive = baby.id === activeBaby?.id;
          const sexInfo = SEX_LABELS[baby.sex ?? 'unknown'];
          const statusInfo = STATUS_LABELS[baby.status ?? 'unknown'];
          const isRemote = baby.createdBy && baby.createdBy !== localDeviceId;

          return (
            <TouchableOpacity
              key={baby.id}
              onPress={() => handleSwitch(baby.id)}
              onLongPress={() => router.push(`/baby/profile?id=${baby.id}`)}
              style={{
                backgroundColor: c.card,
                borderRadius: 18,
                padding: 16,
                borderWidth: 2,
                borderColor: isActive ? c.accent : c.elevated,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: "rgba(0,0,0,0.06)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 26 }}>{baby.avatarEmoji ?? "👶"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: c.textBody }}>
                    {baby.nickname || baby.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "600", marginTop: 1 }}>
                    {calcAge(baby.birthDate).label}
                    {baby.sex ? ` · ${sexInfo.emoji} ${sexInfo.label}` : ""}
                    {baby.status ? ` · ${statusInfo.emoji}` : ""}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    {isActive && (
                      <View style={{
                        backgroundColor: c.accent + "20",
                        borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: c.accent }}>Activo</Text>
                      </View>
                    )}
                    {isRemote && (
                      <View style={{
                        backgroundColor: "#FFE0B2",
                        borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: "#E65100" }}>📡 Sincronizado</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => router.push(`/baby/profile?id=${baby.id}`)}
                    style={{
                      backgroundColor: c.surface, borderRadius: 99,
                      padding: 8,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>✏️</Text>
                  </TouchableOpacity>
                  {!isActive && (
                    <TouchableOpacity
                      onPress={() => handleDelete(baby)}
                      style={{
                        backgroundColor: c.surface, borderRadius: 99,
                        padding: 8,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {isRemote && (
                <View style={{
                  marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.elevated,
                  flexDirection: "row", alignItems: "center", gap: 4,
                }}>
                  <Text style={{ fontSize: 10, color: c.textMuted }}>📡 Creado desde</Text>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: c.accent }}>
                    {baby.createdBy?.slice(0, 8)}...
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ paddingTop: 8, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Acerca de
          </Text>
          <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
            Los bebés sincronizados desde otro dispositivo aparecen con la etiqueta "📡 Sincronizado".
            Toca un bebé para hacerlo activo. Mantén presionado para editar.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
