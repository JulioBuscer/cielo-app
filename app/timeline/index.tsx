import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TimelineScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg px-4">
      <View className="flex-row items-center gap-3 py-4 mb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-cielo text-lg">‹ Volver</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-textPrimary text-3xl font-bold mb-2">📋 Timeline</Text>
      <Text className="text-textMuted">Próximamente — Fase 3</Text>
    </SafeAreaView>
  );
}
