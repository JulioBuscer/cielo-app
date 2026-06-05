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

function FoodItemChipInner({ food, selected, onPress, onLongPress, colors: c, subgroups }: FoodItemChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        borderRadius: 10,
        backgroundColor: selected ? c.accent : c.card,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.border,
      }}
    >
      <View style={{
        paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: selected ? c.accent : c.card,
        borderRadius: 10,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 0,
      }}>
        <Text style={{
          fontSize: 13, textAlign: "left",
          color: selected ? c.textOnAccent : c.textBody,
        }}>
          {food.emoji ?? ""} {food.name}
        </Text>
      </View>

      {!selected && (food.isAllergen || food.warning || food.effect || food.subgroup) && (
        <View style={{
          alignSelf: "flex-start",
          flexDirection: "row", gap: 0,
          padding: 2,
          backgroundColor: c.card,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
        }}>
          {food.isAllergen && (
            <View style={{ borderRadius: 99, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 11 }}>🚨</Text>
            </View>
          )}
          {food.warning && (
            <View style={{ borderRadius: 99, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 11 }}>⚠️</Text>
            </View>
          )}
          {food.subgroup && (
            <View style={{ borderRadius: 99, paddingHorizontal: 4, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: c.textMuted }}>{subgroups[food.subgroup]?.split(" ")[0] ?? ""}</Text>
            </View>
          )}
          {food.effect === "laxative" && (
            <View style={{ backgroundColor: "#E8F5E9", borderRadius: 99, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 11 }}>🟢</Text>
            </View>
          )}
          {food.effect === "astringent" && (
            <View style={{ backgroundColor: "#EFEBE9", borderRadius: 99, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 11 }}>🟤</Text>
            </View>
          )}
          {food.effect === "regulator" && (
            <View style={{ backgroundColor: "#E3F2FD", borderRadius: 99, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 11 }}>🔄</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export const FoodItemChip = memo(FoodItemChipInner);
