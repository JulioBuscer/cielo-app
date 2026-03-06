import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

const variants = {
  primary:   'bg-cielo',
  secondary: 'bg-bgElevated border border-cielo',
  ghost:     'bg-transparent border border-zinc-700',
  growth:    'bg-sky-900 border border-growth',
};

export function BigButton({ label, onPress, variant = 'primary', loading, disabled }: {
  label: string; onPress: () => void;
  variant?: keyof typeof variants;
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled || loading}
      className={`${variants[variant]} rounded-2xl py-4 px-6 items-center min-h-[56px] justify-center`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {loading
        ? <ActivityIndicator color="#F0EFF5" />
        : <Text className="text-textPrimary font-bold text-lg">{label}</Text>}
    </TouchableOpacity>
  );
}
