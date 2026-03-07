import { View, Text, TouchableOpacity } from 'react-native';

/**
 * PoopOMeter — selector de intensidad 0–5.
 * Nuevo diseño: círculos con emoji, estilo claro/rosa.
 */
export function PoopOMeter({
  label, emoji, value, onChange, color, emptyColor = '#FFE4EE',
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  emptyColor?: string;
}) {
  return (
    <View className="mb-5">
      <Text className="text-textPrimary font-bold text-sm mb-3">{label}</Text>
      <View className="flex-row gap-2">
        {/* Botón 0 = ninguno */}
        <TouchableOpacity
          onPress={() => onChange(0)}
          className="items-center justify-center rounded-full"
          style={{
            width: 44, height: 44,
            backgroundColor: value === 0 ? '#FECDD3' : '#FFE4EE',
            borderWidth: value === 0 ? 2 : 1,
            borderColor: value === 0 ? '#FB7185' : '#FECDD3',
          }}
        >
          <Text style={{ fontSize: 16 }}>✕</Text>
        </TouchableOpacity>

        {/* Niveles 1–5 */}
        {[1, 2, 3, 4, 5].map(n => {
          const active = n <= value;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              className="items-center justify-center rounded-full"
              style={{
                width: 44, height: 44,
                backgroundColor: active ? color : emptyColor,
                opacity: active ? 1 : 0.35,
                borderWidth: active ? 0 : 1,
                borderColor: '#FECDD3',
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
