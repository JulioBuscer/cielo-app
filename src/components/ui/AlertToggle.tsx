import { TouchableOpacity, View, Text } from 'react-native';

export function AlertToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${value ? 'bg-red-950 border border-danger' : 'bg-bgCard'}`}
    >
      <Text className={`text-base ${value ? 'text-danger font-bold' : 'text-textMuted'}`}>{label}</Text>
      <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${value ? 'bg-danger border-danger' : 'border-zinc-600'}`}>
        {value && <Text className="text-white text-xs font-bold">✓</Text>}
      </View>
    </TouchableOpacity>
  );
}
