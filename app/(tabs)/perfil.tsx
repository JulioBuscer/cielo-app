import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveBaby, calcAge, STATUS_LABELS } from "@/src/hooks/useBaby";
import { useActiveProfile } from "@/src/hooks/useProfile";
import { useTheme } from "@/src/theme/useTheme";
import packageJson from "@/package.json";

function MenuLink({
  emoji,
  label,
  subtitle,
  onPress,
}: {
  emoji: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: c.card,
        borderRadius: 14,
        padding: 14,
        minHeight: 52,
        borderWidth: 1,
        borderColor: c.elevated,
      }}
    >
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: c.textBody }}>
          {label}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted, marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      <Text style={{ fontSize: 18, color: c.textMuted }}>›</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "800",
        color: theme.colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Text>
  );
}

export default function PerfilScreen() {
  const { theme } = useTheme();
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const c = theme.colors;

  const babyAvatar = (baby as any)?.avatarEmoji ?? "👶";
  const babyPhotoUri = baby?.photoUri ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      >
        <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>
          👤 Perfil
        </Text>

        {/* Baby card */}
        <TouchableOpacity
          onPress={() => router.push("/baby/profile")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: c.card,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: c.elevated,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: c.elevated,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {babyPhotoUri ? (
              <Image
                source={{ uri: babyPhotoUri }}
                style={{ width: 56, height: 56 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ fontSize: 28 }}>{babyAvatar}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: c.textBody }}>
              {baby ? baby.nickname || baby.name : "Sin bebé"}
            </Text>
            {baby && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginTop: 2 }}>
                {calcAge(baby.birthDate).label}
                {baby.status ? ` · ${STATUS_LABELS[baby.status]?.emoji ?? ""}` : ""}
              </Text>
            )}
            {profile && (
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted, marginTop: 1, opacity: 0.7 }}>
                {profile.name}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 18, color: c.textMuted }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/baby")}
          style={{
            backgroundColor: c.card,
            borderRadius: 14,
            padding: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: c.elevated,
            borderStyle: "dashed",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textMuted }}>
            Cambiar de bebé o agregar nuevo
          </Text>
        </TouchableOpacity>

        {/* Sync & Config */}
        <View style={{ gap: 8 }}>
          <SectionHeader label="Sincronización y Datos" />
          <View style={{ gap: 8 }}>
            <MenuLink
              emoji="🔄"
              label="Sincronizar"
              subtitle="Conectar con otro dispositivo"
              onPress={() => router.push("/settings/sync")}
            />
            <MenuLink
              emoji="📋"
              label="Historial de Sync"
              subtitle="Sesiones pasadas y conflictos"
              onPress={() => router.push("/settings/sync-history")}
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <SectionHeader label="Personalización" />
          <View style={{ gap: 8 }}>
            <MenuLink
              emoji="🎨"
              label="Temas"
              subtitle="Personaliza colores y apariencia"
              onPress={() => router.push("/settings/theme")}
            />
            <MenuLink
              emoji="📋"
              label="Catálogos"
              subtitle="Tipos de evento, escalas y observaciones"
              onPress={() => router.push("/settings/catalogs")}
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <SectionHeader label="Referencia" />
          <View style={{ gap: 8 }}>
            <MenuLink
              emoji="📈"
              label="Curvas OMS"
              subtitle="Peso, talla y CC con percentiles"
              onPress={() => router.push("/logs/growth/history")}
            />
            <MenuLink
              emoji="📝"
              label="Historial completo"
              subtitle="Todos los registros con filtros"
              onPress={() => router.push("/history")}
            />
            <MenuLink
              emoji="🍽️"
              label="Comidas"
              subtitle="Historial de alimentación complementaria"
              onPress={() => router.push("/logs/food/history")}
            />
            <MenuLink
              emoji="🌡️"
              label="Salud"
              subtitle="Temperatura, medicamentos y síntomas"
              onPress={() => router.push("/logs/health/new")}
            />
            <MenuLink
              emoji="🥗"
              label="Alimentos OMS"
              subtitle="Catálogo de alimentación complementaria"
              onPress={() => router.push("/catalog/food")}
            />
            <MenuLink
              emoji="🥜"
              label="Alérgenos"
              subtitle="Seguimiento de introducción de alérgenos"
              onPress={() => router.push("/food/allergens")}
            />
            <MenuLink
              emoji="⏳"
              label="Ventanas de sueño"
              subtitle="Tiempo despierto entre siestas"
              onPress={() => router.push("/wake-windows")}
            />
            <MenuLink
              emoji="📖"
              label="Recursos"
              subtitle="Guía de colores, consistencias y sueño"
              onPress={() => router.push("/resources")}
            />
          </View>
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: c.elevated,
            paddingTop: 16,
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>
            Cielo App v{packageJson.version}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
