import { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { AppTheme } from "@/src/theme/types";

interface FoodItem {
  id: string;
  name: string;
  emoji?: string | null;
  subgroup?: string | null;
  isAllergen?: boolean | null;
  warning?: string | null;
  effect?: string | null;
}

interface FoodItemChipProps {
  food: FoodItem;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: AppTheme["colors"];
  subgroups: Record<string, string>;
}

function FoodItemChipInner({ food, selected, onPress, onLongPress, colors: c }: FoodItemChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 10,
        backgroundColor: selected ? c.accent : c.card,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.border,
        paddingHorizontal: 8,
        paddingVertical: 5,
      }}
    >
      <Text style={{
        fontSize: 16,
        color: selected ? c.textOnAccent : c.textBody,
      }}>
        {food.emoji ?? "🍽️"}
      </Text>
      <Text style={{
        fontSize: 13, fontWeight: "600",
        color: selected ? c.textOnAccent : c.textBody,
        includeFontPadding: false,
      }}>
        {food.name}
      </Text>
      {!selected && (food.isAllergen || food.warning || food.effect) && (
        <View style={{ flexDirection: "row", gap: 1, marginLeft: 2 }}>
          {food.isAllergen && (
            <Text style={{ fontSize: 10 }}>🚨</Text>
          )}
          {food.warning && (
            <Text style={{ fontSize: 10 }}>⚠️</Text>
          )}
          {food.effect === "laxative" && (
            <Text style={{ fontSize: 10, color: "#2E7D32" }}>●</Text>
          )}
          {food.effect === "astringent" && (
            <Text style={{ fontSize: 10, color: "#795548" }}>●</Text>
          )}
          {food.effect === "regulator" && (
            <Text style={{ fontSize: 10, color: "#1565C0" }}>●</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export const FoodItemChip = memo(FoodItemChipInner);
