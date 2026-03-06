import { View, Text, TouchableOpacity } from 'react-native';

export function PoopOMeter({ label, value, onChange, color }: {
  label: string; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-textPrimary mb-2 text-base">{label}</Text>
      <View className="flex-row gap-2">
        {[0, 1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n} onPress={() => onChange(n)}
            className="flex-1 h-10 rounded-lg items-center justify-center"
            style={{ backgroundColor: n === 0 ? '#1C1C2E' : n <= value ? color : '#1C1C2E', opacity: n > 0 && n > value ? 0.3 : 1 }}
          >
            <Text className="text-textPrimary text-sm font-bold">{n === 0 ? '✗' : n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
