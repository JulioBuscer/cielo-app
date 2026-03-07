import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

const variants = {
  primary:   { bg: '#FF5C9A', text: '#FFFFFF', border: 'transparent' },
  secondary: { bg: '#FFE4EE', text: '#FF5C9A', border: '#FFB7D5' },
  ghost:     { bg: 'transparent', text: '#9B7A88', border: '#FFD6E8' },
  danger:    { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
  green:     { bg: '#25D366', text: '#FFFFFF', border: 'transparent' },
};

export function BigButton({
  label, onPress,
  variant = 'primary',
  loading, disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: keyof typeof variants;
  loading?: boolean;
  disabled?: boolean;
}) {
  const v = variants[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: v.bg,
        borderColor: v.border,
        borderWidth: v.border === 'transparent' ? 0 : 1.5,
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        opacity: disabled ? 0.45 : 1,
        shadowColor: v.bg,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: disabled ? 0 : 0.3,
        shadowRadius: 8,
        elevation: disabled ? 0 : 4,
      }}
    >
      {loading
        ? <ActivityIndicator color={v.text} />
        : <Text style={{ color: v.text, fontWeight: '800', fontSize: 16 }}>{label}</Text>
      }
    </TouchableOpacity>
  );
}
