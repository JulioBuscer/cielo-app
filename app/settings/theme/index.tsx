import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme";
import { getAllThemes, deleteCustomTheme, saveCustomTheme } from "@/src/theme/themeStorage";
import type { AppTheme } from "@/src/theme/types";

function ThemeCard({
  theme,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: {
  theme: AppTheme;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme: cur } = useTheme();
  const c = cur.colors;

  return (
    <TouchableOpacity
      onPress={onSelect}
      style={{
        backgroundColor: c.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 2,
        borderColor: isActive ? c.accent : "transparent",
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {/* Color swatches */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 22 }}>🎨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                color: c.textBody,
                fontWeight: "900",
                fontSize: 16,
              }}
            >
              {theme.name}
            </Text>
            {isActive && (
              <View
                style={{
                  backgroundColor: c.accent,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 99,
                }}
              >
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  ACTIVO
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 12,
              fontWeight: "600",
              marginTop: 1,
            }}
          >
            {theme.isBuiltIn ? "Tema por defecto" : "Tema personalizado"}
          </Text>
        </View>
      </View>

      {/* Color palette preview */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[
          theme.colors.surface,
          theme.colors.card,
          theme.colors.elevated,
          theme.colors.headerBg,
          theme.colors.accent,
          theme.colors.textBody,
        ].map((color, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
              borderWidth: color === theme.colors.card ? 1 : 0,
              borderColor: theme.colors.elevated,
            }}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {!theme.isBuiltIn && (
          <>
            <TouchableOpacity
              onPress={onEdit}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 99,
                backgroundColor: c.elevated,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: c.textBody,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                ✏️ Editar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 99,
                backgroundColor: c.danger + "20",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: c.danger,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                🗑️ Borrar
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ThemeSelectorScreen() {
  const { theme: cur, activeId, setTheme, refreshCustomThemes } = useTheme();
  const c = cur.colors;
  const [themes, setThemes] = useState<AppTheme[]>([]);

  const load = async () => {
    const all = await getAllThemes();
    const hasLavender = all.some((t) => t.id === "lavender");
    if (!hasLavender) {
      await saveCustomTheme({
        id: "lavender",
        name: "Lavender Dream",
        isBuiltIn: false,
        colors: {
          surface: "#FEDFED",
          card: "#FFFFFF",
          elevated: "#F2E6F5",
          inputBg: "#FFF5FA",
          textBody: "#3D2B4F",
          textMuted: "#7A5D88",
          textDim: "#A58BB0",
          textOnAccent: "#FFFFFF",
          accent: "#8FA2D4",
          accentStrong: "#AD81BE",
          accentLight: "#D5B5EA",
          headerBg: "#8FA2D4",
          headerText: "#FFFFFF",
          border: "#EEE2F5",
          bubbleOwn: "#EADCF5",
          bubbleOther: "#FFFFFF",
          success: "#95D1AA",
          warning: "#D4A85A",
          danger: "#E07070",
          whatsGreen: "#25D366",
          biological: { pee: "#D4A85A", poop: "#8B7355" },
          feeding: { bottle: "#95D1AA", breast: "#AD81BE" },
          growth: "#72A098",
        },
      });
      return load();
    }
    setThemes(all);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = (t: AppTheme) => {
    Alert.alert(
      "Borrar tema",
      `¿Eliminar "${t.name}"? No se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            await deleteCustomTheme(t.id);
            if (activeId === t.id) {
              await setTheme("light");
            }
            await refreshCustomThemes();
            await load();
          },
        },
      ]
    );
  };

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
          🎨 Tema
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/settings/theme/editor")}
          style={{
            backgroundColor: "rgba(255,255,255,0.3)",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 99,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12 }}>
            + Nuevo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ backgroundColor: c.surface, flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      >
        {themes.map((t) => (
          <ThemeCard
            key={t.id}
            theme={t}
            isActive={activeId === t.id}
            onSelect={async () => {
              await setTheme(t.id);
              await refreshCustomThemes();
              await load();
            }}
            onEdit={() =>
              router.push({
                pathname: "/settings/theme/editor",
                params: { themeId: t.id },
              })
            }
            onDelete={() => handleDelete(t)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
