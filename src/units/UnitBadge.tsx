import { Text, type TextProps } from "react-native";
import { getUnit } from "./registry";

interface UnitBadgeProps extends TextProps {
  unitId: string;
}

export function UnitBadge({ unitId, style, ...rest }: UnitBadgeProps) {
  const unit = getUnit(unitId);
  if (!unit || !unit.symbol) return null;
  return (
    <Text
      style={[
        {
          fontSize: 13,
          fontWeight: "700",
          color: "#9B7A88",
        },
        style,
      ]}
      {...rest}
    >
      {unit.symbol}
    </Text>
  );
}
