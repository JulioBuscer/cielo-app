import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/useTheme";
import { getThemeById, saveCustomTheme, getCustomThemes } from "@/src/theme/themeStorage";
import { lightTheme, darkTheme } from "@/src/theme/themes";
import type { AppTheme } from "@/src/theme/types";
import { generateId } from "@/src/utils/id";

const COMMON_COLORS = [
  "#FF8AB3", "#FF5C9A", "#FFB7D5", "#1A1A2E", "#2A2A3E",
  "#FFFFFF", "#FFF0F5", "#FFE4EE", "#2D1B26", "#9B7A88",
  "#4CAF50", "#F44336", "#FFC107", "#2196F3", "#9C27B0",
  "#3A1A2E", "#3A3A4E", "#BBBBBB", "#666666", "#25D366",
];

interface Field {
  key: string;
  label: string;
  path: string[];
}

const COLOR_FIELDS: Field[] = [
  { key: "surface", label: "Fondo principal", path: ["surface"] },
  { key: "card", label: "Tarjetas", path: ["card"] },
  { key: "elevated", label: "Superficie elevada", path: ["elevated"] },
  { key: "inputBg", label: "Fondo inputs", path: ["inputBg"] },
  { key: "textBody", label: "Texto principal", path: ["textBody"] },
  { key: "textMuted", label: "Texto secundario", path: ["textMuted"] },
  { key: "textDim", label: "Texto tenue", path: ["textDim"] },
  { key: "accent", label: "Acento (rosa)", path: ["accent"] },
  { key: "accentStrong", label: "Acento fuerte", path: ["accentStrong"] },
  { key: "accentLight", label: "Acento claro", path: ["accentLight"] },
  { key: "headerBg", label: "Fondo header", path: ["headerBg"] },
  { key: "headerText", label: "Texto header", path: ["headerText"] },
  { key: "border", label: "Bordes", path: ["border"] },
  { key: "bubbleOwn", label: "Burbuja propia", path: ["bubbleOwn"] },
  { key: "bubbleOther", label: "Burbuja otro", path: ["bubbleOther"] },
  { key: "success", label: "Éxito", path: ["success"] },
  { key: "warning", label: "Advertencia", path: ["warning"] },
  { key: "danger", label: "Peligro", path: ["danger"] },
];

export default function ThemeEditorScreen() {
  const params = useLocalSearchParams<{ themeId?: string }>();
  const { theme: cur, refreshCustomThemes } = useTheme();
  const c = cur.colors;

  const [name, setName] = useState("");
  const [colors, setColors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (params.themeId) {
        const existing = await getThemeById(params.themeId);
        if (existing) {
          setName(existing.name);
          const flat: Record<string, string> = {};
          for (const field of COLOR_FIELDS) {
            flat[field.key] = existing.colors[field.key as keyof typeof existing.colors] as string;
          }
          setColors(flat);
          return;
        }
      }
      // New theme: copy from current
      setName(`Mi tema #${Date.now() % 1000}`);
      const flat: Record<string, string> = {};
      for (const field of COLOR_FIELDS) {
        flat[field.key] = cur.colors[field.key as keyof typeof cur.colors] as string;
      }
      setColors(flat);
    })();
  }, [params.themeId]);

  const setColor = (key: string, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre del tema no puede estar vacío");
      return;
    }
    setSaving(true);
    try {
      const id = params.themeId ?? `custom_${generateId()}`;
      const theme: AppTheme = {
        id,
        name: name.trim(),
        isBuiltIn: false,
        colors: {
          ...colors,
          biological: { pee: "#F5C842", poop: "#8B5E3C" },
          feeding: { bottle: "#A855F7", breast: "#FF8AB3" },
          growth: "#0EA5E9",
          textOnAccent: "#FFFFFF",
          whatsGreen: "#25D366",
        } as AppTheme["colors"],
      };
      await saveCustomTheme(theme);
      await refreshCustomThemes();
      Alert.alert("✅ Guardado", `Tema "${theme.name}" guardado`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
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
          {params.themeId ? "✏️ Editar tema" : "➕ Nuevo tema"}
        </Text>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.surface ?? c.surface, flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      >
        {/* Theme name */}
        <View
          style={{
            backgroundColor: colors.card ?? c.card,
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
              marginBottom: 6,
            }}
          >
            Nombre del tema
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Mi tema"
            placeholderTextColor={c.textMuted}
            style={{
              backgroundColor: colors.inputBg ?? c.inputBg,
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              fontWeight: "800",
              color: colors.textBody ?? c.textBody,
            }}
          />
        </View>

        {/* Color fields */}
        <View
          style={{
            backgroundColor: colors.card ?? c.card,
            borderRadius: 20,
            padding: 16,
            gap: 4,
          }}
        >
          <Text
            style={{
              color: c.textMuted,
              fontWeight: "700",
              fontSize: 11,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Colores
          </Text>

          {COLOR_FIELDS.map((field) => {
            const val = colors[field.key] ?? "#000000";
            return (
              <View
                key={field.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.elevated ?? c.elevated,
                }}
              >
                {/* Color preview */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: val,
                    borderWidth: 1,
                    borderColor: colors.elevated ?? c.elevated,
                  }}
                />
                {/* Label */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textBody ?? c.textBody,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {field.label}
                  </Text>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {field.key}
                  </Text>
                </View>
                {/* Hex input */}
                <TouchableOpacity onPress={() => setSelectedField(field.key)}>
                  <TextInput
                    value={val}
                    onChangeText={(v) => setColor(field.key, v)}
                    onFocus={() => setSelectedField(field.key)}
                    placeholder="#000000"
                    placeholderTextColor={c.textMuted}
                    maxLength={7}
                    autoCapitalize="characters"
                    style={{
                      backgroundColor: (colors.inputBg ?? c.inputBg),
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      fontSize: 12,
                      fontWeight: "700",
                      color: colors.textBody ?? c.textBody,
                      width: 80,
                      textAlign: "center",
                      fontFamily: "monospace",
                      borderWidth: selectedField === field.key ? 2 : 0,
                      borderColor: colors.accent ?? c.accent,
                    }}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Quick color palette */}
        <View
          style={{
            backgroundColor: colors.card ?? c.card,
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
              marginBottom: 4,
            }}
          >
            Paleta rápida
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 10,
              fontWeight: "600",
              marginBottom: 10,
            }}
          >
            {selectedField
              ? `Aplicando a: ${COLOR_FIELDS.find((f) => f.key === selectedField)?.label ?? selectedField}`
              : "Toca un campo de color arriba y luego un color aquí"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {COMMON_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => {
                  if (selectedField) setColor(selectedField, color);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: color,
                  borderWidth: 1,
                  borderColor: colors.elevated ?? c.elevated,
                }}
              />
            ))}
          </View>
        </View>

        {/* Live preview */}
        <View
          style={{
            backgroundColor: colors.surface ?? c.surface,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.elevated ?? c.elevated,
          }}
        >
          <Text
            style={{
              color: c.textMuted,
              fontWeight: "700",
              fontSize: 11,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Vista previa en vivo
          </Text>

          {/* Simulated header */}
          <View
            style={{
              backgroundColor: colors.headerBg ?? c.headerBg,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: colors.headerText ?? c.headerText,
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              Header
            </Text>
          </View>

          {/* Simulated card */}
          <View
            style={{
              backgroundColor: colors.card ?? c.card,
              borderRadius: 12,
              padding: 12,
              gap: 6,
              borderWidth: 1,
              borderColor: colors.elevated ?? c.elevated,
            }}
          >
            <Text
              style={{
                color: colors.textBody ?? c.textBody,
                fontWeight: "800",
                fontSize: 14,
              }}
            >
              Tarjeta de ejemplo
            </Text>
            <Text
              style={{
                color: colors.textMuted ?? c.textMuted,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Texto secundario con información adicional
            </Text>
            <View
              style={{
                backgroundColor: colors.accent ?? c.accent,
                borderRadius: 99,
                paddingHorizontal: 12,
                paddingVertical: 4,
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  color: colors.textOnAccent ?? c.textOnAccent,
                  fontWeight: "800",
                  fontSize: 11,
                }}
              >
                Botón
              </Text>
            </View>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: colors.accent ?? c.accent,
            borderRadius: 99,
            paddingVertical: 14,
            alignItems: "center",
            opacity: saving ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              color: colors.textOnAccent ?? "#FFF",
              fontWeight: "900",
              fontSize: 16,
            }}
          >
            {saving ? "💾 Guardando..." : "💾 Guardar tema"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
