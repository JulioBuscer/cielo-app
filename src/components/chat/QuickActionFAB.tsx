import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import type { FeedingType, BottleSubtype } from "@/src/hooks/useFeedingSessions";

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

interface QuickActionFABProps {
  onAction: (action: {
    id: ActionId;
    bottleSubtype?: BottleSubtype;
  }) => void;
  activeSleep: boolean;
  sleepLoading: boolean;
  disabled?: boolean;
}

export function QuickActionFAB({
  onAction,
  activeSleep,
  sleepLoading,
  disabled,
}: QuickActionFABProps) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const handleOpen = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setOpen(false));
  };

  const handleAction = (action: ActionItem) => {
    if (action.id === "sleep") {
      onAction({ id: "sleep" });
      handleClose();
      return;
    }
    onAction({ id: action.id });
    handleClose();
  };

  return (
    <>
      {open && (
        <Modal
          visible={open}
          transparent
          animationType="none"
          onRequestClose={handleClose}
        >
          <Pressable
            style={{ flex: 1, justifyContent: "flex-end" }}
            onPress={handleClose}
          >
            <Animated.View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.4)",
                opacity: overlayAnim,
              }}
            />
          </Pressable>

          <Animated.View
            style={{
              position: "absolute",
              bottom: 100,
              right: 20,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <View
              style={{
                backgroundColor: c.card,
                borderRadius: 24,
                padding: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    justifyContent: "center",
                  }}
                >
                  {ACTIONS.map((action) => {
                    const isSleepActive = action.id === "sleep" && activeSleep;
                    const isSleepLoading =
                      action.id === "sleep" && sleepLoading;
                    return (
                      <TouchableOpacity
                        key={action.id}
                        onPress={() => handleAction(action)}
                        disabled={disabled || isSleepLoading}
                        style={{
                          width: 80,
                          alignItems: "center",
                          gap: 4,
                          opacity:
                            disabled || isSleepLoading ? 0.4 : 1,
                          padding: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 26,
                            backgroundColor: isSleepActive
                              ? "#6366F1"
                              : action.color,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 22 }}>
                            {isSleepActive ? "☀️" : action.emoji}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: "800",
                            color: c.textMuted,
                            textAlign: "center",
                            lineHeight: 12,
                          }}
                        >
                          {isSleepActive ? "Despertar" : action.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </Modal>
      )}

      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.8}
        style={{
          position: "absolute",
          bottom: 88,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.whatsGreen ?? c.accent,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: c.whatsGreen ?? c.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
          zIndex: 50,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 28,
            fontWeight: "300",
            lineHeight: 30,
          }}
        >
          +
        </Text>
      </TouchableOpacity>
    </>
  );
}

export type { ActionId, ActionItem };
