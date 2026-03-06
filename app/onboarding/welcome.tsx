import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeScreen } from '@/src/components/layout/SafeScreen';
import { BigButton } from '@/src/components/ui/BigButton';

export default function Welcome() {
  return (
    <SafeScreen>
      <View className="flex-1 justify-center items-center px-4">
        <Text className="text-cielo text-6xl mb-6">🌙</Text>
        <Text className="text-textPrimary text-4xl font-bold mb-2 text-center">Cielo App</Text>
        <Text className="text-textMuted text-lg text-center mb-12">
          Tu bitácora offline, privada y rápida para el cuidado del bebé.
        </Text>
      </View>
      <View className="pb-8">
        <BigButton
          label="Comenzar 🚀"
          onPress={() => router.push('/onboarding/role')}
        />
      </View>
    </SafeScreen>
  );
}
