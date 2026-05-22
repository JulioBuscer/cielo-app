import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { useActiveBaby } from "@/src/hooks/useBaby";
import packageJson from "@/package.json";

const SETTINGS_ITEMS: { emoji: string; label: string; desc: string; route: string }[] = [
  { emoji: "📝", label: "Catálogos", desc: "Eventos, pipí, popó, observaciones", route: "/settings/catalogs" },
  { emoji: "🎨", label: "Tema", desc: "Personalizar colores de la app", route: "/settings/theme" },
  { emoji: "👤", label: "Perfil del bebé", desc: "Nombre, avatar, datos", route: "/baby/profile" },
];

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { data: baby } = useActiveBaby();
  const c = theme.colors;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      {/* Header */}
      <View
        style={{
          backgroundColor: c.headerBg,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 16 }}
        >
          <Text style={{ color: c.headerText, fontSize: 26, lineHeight: 28 }}>
            ←
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            color: c.headerText,
            fontWeight: "900",
            fontSize: 18,
            flex: 1,
          }}
        >
          ⚙️ Ajustes
        </Text>
      </View>

      <ScrollView
        style={{ backgroundColor: c.surface, flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {/* Baby card */}
        <TouchableOpacity
          onPress={() => router.push("/baby/profile")}
          style={{
            backgroundColor: c.card,
            borderRadius: 20,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
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
            }}
          >
            <Text style={{ fontSize: 28 }}>
              {baby?.avatarEmoji ?? "👶"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: c.textBody,
                fontWeight: "900",
                fontSize: 17,
              }}
            >
              {baby ? baby.nickname || baby.name : "Cielo"}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontSize: 13,
                fontWeight: "600",
                marginTop: 2,
              }}
            >
              {baby?.sex === "female"
                ? "👧"
                : baby?.sex === "male"
                  ? "👦"
                  : "👶"}{" "}
              · {baby?.birthDate?.toString() ?? "—"}
            </Text>
          </View>
          <Text style={{ color: c.textMuted, fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        {/* Settings list */}
        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {SETTINGS_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                gap: 14,
                borderBottomWidth: i < SETTINGS_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: c.elevated,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: c.elevated,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: c.textBody,
                    fontWeight: "800",
                    fontSize: 15,
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontSize: 12,
                    fontWeight: "600",
                    marginTop: 1,
                  }}
                >
                  {item.desc}
                </Text>
              </View>
              <Text style={{ color: c.textMuted, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Theme preview */}
        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 20,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: c.textMuted,
              fontWeight: "700",
              fontSize: 11,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Tema activo
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: c.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22 }}>🎨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.textBody,
                  fontWeight: "800",
                  fontSize: 16,
                }}
              >
                {theme.name}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {theme.isBuiltIn ? "Tema por defecto" : "Tema personalizado"}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 4,
              }}
            >
              {[c.surface, c.card, c.accent, c.textBody].map((color, i) => (
                <View
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    backgroundColor: color,
                    borderWidth: color === c.card ? 1 : 0,
                    borderColor: c.elevated,
                  }}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Version */}
        <Text
          style={{
            color: c.textMuted,
            fontSize: 12,
            fontWeight: "600",
            textAlign: "center",
            paddingVertical: 8,
          }}
        >
          Cielo App v{packageJson.version}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
