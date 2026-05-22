import { TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from "@/src/theme/useTheme";

export function AlertToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      className="flex-row items-center justify-between p-4 rounded-xl mb-2"
      style={{
        backgroundColor: value ? c.danger : c.card,
        borderWidth: value ? 1 : 0,
        borderColor: value ? c.danger : undefined,
      }}
    >
      <Text className="text-base" style={{ color: value ? c.danger : c.textMuted, fontWeight: value ? '700' : '400' }}>{label}</Text>
      <View
        className="w-6 h-6 rounded-full border-2 items-center justify-center"
        style={{
          backgroundColor: value ? c.danger : 'transparent',
          borderColor: value ? c.danger : c.textMuted,
        }}
      >
        {value && <Text className="text-xs font-bold" style={{ color: c.textOnAccent }}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}
