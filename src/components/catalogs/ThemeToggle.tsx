import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

export function ThemeToggle() {
  const { theme, activeId, setTheme } = useTheme();
  const c = theme.colors;
  const mode = activeId === "dark" ? "dark" : activeId === "light" ? "light" : "custom";
  return (
    <View
      className="flex-row items-center justify-center pb-2"
      style={{ gap: 8, backgroundColor: c.headerBg }}
    >
      {(["light", "dark"] as const).map((m) => {
        const active = mode === m;
        return (
          <TouchableOpacity
            key={m}
            onPress={() => setTheme(m)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: active ? "rgba(255,255,255,0.3)" : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? c.headerText : "rgba(255,255,255,0.7)",
                fontWeight: active ? "800" : "600",
                fontSize: 13,
              }}
            >
              {m === "light" ? "☀️ Claro" : "🌙 Oscuro"}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
