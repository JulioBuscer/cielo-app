import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import type { BottleSubtype } from "@/src/hooks/useFeedingSessions";

type ActionId =
  | "breast_left"
  | "breast_right"
  | "bottle"
  | "sleep"
  | "diaper"
  | "food"
  | "temperature"
  | "growth"
  | "event";

interface ActionItem {
  id: ActionId;
  emoji: string;
  label: string;
  color: string;
}

const ACTIONS: ActionItem[] = [
  { id: "breast_left", emoji: "🤱", label: "Pecho Izq.", color: "#FF8AB3" },
  { id: "breast_right", emoji: "🤱", label: "Pecho Der.", color: "#FF6B9D" },
  { id: "bottle", emoji: "🍼", label: "Biberón", color: "#A855F7" },
  { id: "sleep", emoji: "😴", label: "Dormir", color: "#818CF8" },
  { id: "diaper", emoji: "🍑", label: "Pañal", color: "#F59E0B" },
  { id: "food", emoji: "🥦", label: "Comida", color: "#7CB342" },
  { id: "temperature", emoji: "🌡️", label: "Temp.", color: "#F97316" },
  { id: "growth", emoji: "📏", label: "Medir", color: "#0EA5E9" },
  { id: "event", emoji: "⚡", label: "Más", color: "#845EC2" },
];

interface ActionPanelProps {
  onAction: (action: { id: ActionId; bottleSubtype?: BottleSubtype }) => void;
  activeSleep: boolean;
  sleepLoading: boolean;
  disabled?: boolean;
}

export function ActionPanel({ onAction, activeSleep, sleepLoading, disabled }: ActionPanelProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={{
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingVertical: 12,
      paddingHorizontal: 8,
      paddingBottom: Platform.OS === "ios" ? 24 : 12,
    }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {ACTIONS.map((action) => {
          const isSleepActive = action.id === "sleep" && activeSleep;
          const isSleepLoading = action.id === "sleep" && sleepLoading;
          return (
            <TouchableOpacity
              key={action.id}
              onPress={() => onAction({ id: action.id })}
              disabled={disabled || isSleepLoading}
              style={{
                width: "30%",
                alignItems: "center",
                gap: 4,
                opacity: disabled || isSleepLoading ? 0.4 : 1,
                paddingVertical: 6,
              }}
            >
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: isSleepActive ? "#6366F1" : action.color,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text style={{ fontSize: 22 }}>
                  {isSleepActive ? "☀️" : action.emoji}
                </Text>
              </View>
              <Text style={{
                fontSize: 10,
                fontWeight: "800",
                color: c.textMuted,
                textAlign: "center",
                lineHeight: 13,
              }}>
                {isSleepActive ? "Despertar" : action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export type { ActionId, ActionItem };
