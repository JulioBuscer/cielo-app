import { useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeScreen } from '@/src/components/layout/SafeScreen';
import { BigButton } from '@/src/components/ui/BigButton';
import { useCreateProfile } from '@/src/hooks/useProfile';
import { ROLES, type Role } from '@/src/constants/roles';

export default function RoleSelection() {
  const [name, setName] = useState('');
  const [roleMode, setRoleMode] = useState<Role>('mama');
  const createProfile = useCreateProfile();

  const handleNext = () => {
    if (!name.trim()) return;
    createProfile.mutate(
      { name: name.trim(), role: roleMode },
      {
        onSuccess: () => router.push('/onboarding/baby'),
        onError: (e: any) => {
          Alert.alert('Error al guardar', e?.message ?? 'Error desconocido');
          console.error('createProfile error:', e);
        },
      }
    );
  };

  return (
    <SafeScreen scrollable>
      <Text className="text-textPrimary text-3xl font-bold mb-2">Tu Perfil</Text>
      <Text className="text-textMuted text-base mb-8">
        Cielo App es 100% offline. Estos datos se quedan en tu dispositivo.
      </Text>

      <Text className="text-textPrimary font-bold mb-3">¿Cómo te llamas?</Text>
      <TextInput
        className="bg-bgCard text-textPrimary px-4 py-4 rounded-xl text-lg mb-8"
        placeholder="Ej: Laura"
        placeholderTextColor="#6B6880"
        value={name}
        onChangeText={setName}
      />

      <Text className="text-textPrimary font-bold mb-3">Tu Rol</Text>
      <View className="flex-row flex-wrap gap-3 mb-10">
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => setRoleMode(r.id)}
            className={`px-4 py-3 rounded-full border-2 flex-row items-center gap-2 ${
              roleMode === r.id ? 'border-cielo bg-bgElevated' : 'border-bgCard bg-bgCard'
            }`}
          >
            <Text className="text-xl">{r.emoji}</Text>
            <Text className={roleMode === r.id ? 'text-cielo font-bold' : 'text-textMuted'}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <BigButton
        label="Siguiente"
        disabled={!name.trim() || createProfile.isPending}
        loading={createProfile.isPending}
        onPress={handleNext}
      />
    </SafeScreen>
  );
}
