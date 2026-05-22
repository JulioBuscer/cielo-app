import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from "@/src/theme/useTheme";

export function PoopOMeter({
  label, emoji, value, onChange, color, emptyColor,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  emptyColor?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const resolvedEmpty = emptyColor ?? c.elevated;

  return (
    <View className="mb-5">
      <Text className="font-bold text-sm mb-3" style={{ color: c.textBody }}>{label}</Text>
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => onChange(0)}
          className="items-center justify-center rounded-full"
          style={{
            width: 44, height: 44,
            backgroundColor: value === 0 ? c.accentLight : resolvedEmpty,
            borderWidth: value === 0 ? 2 : 1,
            borderColor: value === 0 ? c.accentStrong : c.accentLight,
          }}
        >
          <Text style={{ fontSize: 16 }}>✕</Text>
        </TouchableOpacity>

        {[1, 2, 3, 4, 5].map(n => {
          const active = n <= value;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              className="items-center justify-center rounded-full"
              style={{
                width: 44, height: 44,
                backgroundColor: active ? color : resolvedEmpty,
                opacity: active ? 1 : 0.35,
                borderWidth: active ? 0 : 1,
                borderColor: c.accentLight,
              }}
            >
              <Text style={{ fontSize: 18 }}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
