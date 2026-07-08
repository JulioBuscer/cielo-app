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

interface FoodGridCardProps {
  food: FoodItem;
  selected: boolean;
  consumed: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: AppTheme["colors"];
  advanced?: boolean;
}

function FoodGridCardInner({ food, selected, consumed, onPress, onLongPress, colors: c, advanced }: FoodGridCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={{
        width: "100%",
        aspectRatio: 1,
        borderRadius: 14,
        backgroundColor: selected ? c.accent : c.card,
        borderWidth: 1.5,
        borderColor: selected ? c.accent : consumed ? "#4CAF50" : c.border,
        padding: 6,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 28, lineHeight: 34 }}>
        {food.emoji ?? "🍽️"}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          fontSize: 11, fontWeight: "600", textAlign: "center",
          color: selected ? c.textOnAccent : c.textBody,
          includeFontPadding: false,
          lineHeight: 14,
        }}
      >
        {food.name}
      </Text>

      {advanced && (
        <View style={{ flexDirection: "row", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          {food.isAllergen && (
            <Text style={{ fontSize: 9 }}>🚨</Text>
          )}
          {food.warning && (
            <Text style={{ fontSize: 9 }}>⚠️</Text>
          )}
          {food.effect === "laxative" && (
            <Text style={{ fontSize: 8, color: "#2E7D32" }}>●</Text>
          )}
          {food.effect === "astringent" && (
            <Text style={{ fontSize: 8, color: "#795548" }}>●</Text>
          )}
          {food.effect === "regulator" && (
            <Text style={{ fontSize: 8, color: "#1565C0" }}>●</Text>
          )}
        </View>
      )}

      <View
        style={{
          position: "absolute", bottom: 5, right: 5,
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: consumed ? "#4CAF50" : c.textDim,
        }}
      />
    </TouchableOpacity>
  );
}

export const FoodGridCard = memo(FoodGridCardInner);
