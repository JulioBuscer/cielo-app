import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeScreen } from '@/src/components/layout/SafeScreen';
import { BigButton } from '@/src/components/ui/BigButton';
import { useCreateBaby } from '@/src/hooks/useBaby';

export default function BabySetup() {
  const [name, setName] = useState('');
  const createBaby = useCreateBaby();

  const handleFinish = () => {
    if (!name.trim()) return;
    createBaby.mutate(
      { name: name.trim(), birthDate: new Date() }, // V1: asumimos hoy, o simplificamos
      { onSuccess: () => router.replace('/dashboard') }
    );
  };

  return (
    <SafeScreen scrollable>
      <Text className="text-textPrimary text-3xl font-bold mb-2 pt-2">El Bebé</Text>
      <Text className="text-textMuted text-base mb-8">
        ¿A quién vas a cuidar hoy?
      </Text>

      <Text className="text-textPrimary font-bold mb-3">Nombre o Apodo</Text>
      <TextInput
        className="bg-bgCard text-textPrimary px-4 py-4 rounded-xl text-lg mb-10"
        placeholder="Ej: Emiliano"
        placeholderTextColor="#6B6880"
        value={name}
        onChangeText={setName}
      />

      <BigButton
        label="Comenzar a usar Cielo ✨"
        disabled={!name.trim()}
        loading={createBaby.isPending}
        onPress={handleFinish}
      />
    </SafeScreen>
  );
}
