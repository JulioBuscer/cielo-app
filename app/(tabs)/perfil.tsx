import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
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

export default function AjustesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: c.textBody }}>
          ⚙️ Ajustes
        </Text>

        <View style={{ gap: 8 }}>
          <SectionHeader label="Sincronización" />
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
              subtitle="Eventos, escalas, observaciones"
              onPress={() => router.push("/settings/catalogs")}
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <SectionHeader label="Utilidades" />
          <View style={{ gap: 8 }}>
            <MenuLink
              emoji="🥗"
              label="Alimentos OMS"
              subtitle="Catálogo de alimentación complementaria"
              onPress={() => router.push("/catalog/food")}
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
