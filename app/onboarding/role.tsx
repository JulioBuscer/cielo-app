import { useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, ScrollView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/src/components/ui/BigButton';
import { useCreateProfile } from '@/src/hooks/useProfile';
import { ROLES, type Role } from '@/src/constants/roles';

export default function RoleSelection() {
  const [name, setName]         = useState('');
  const [roleMode, setRoleMode] = useState<Role>('mama');
  const createProfile           = useCreateProfile();

  const handleNext = () => {
    if (!name.trim()) return;
    createProfile.mutate(
      { name: name.trim(), role: roleMode },
      {
        onSuccess: () => router.push('/onboarding/baby'),
        onError: (e: any) => console.error('createProfile error:', e),
      }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF8AB3' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />

      <View style={{
        paddingHorizontal: 20, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22 }}>Tu Perfil</Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#FFF0F5', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 13, color: '#9B7A88', fontWeight: '600', marginBottom: 20, lineHeight: 20 }}>
          Cielo App es 100% offline. Estos datos se quedan en tu dispositivo.
        </Text>

        {/* Nombre */}
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 20,
          padding: 16, marginBottom: 12,
          shadowColor: '#FF8AB3', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
        }}>
          <Text style={{ fontWeight: '800', fontSize: 13, color: '#9B7A88', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ¿Cómo te llamas?
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFF0F5', borderRadius: 12,
              padding: 14, fontSize: 16, color: '#2D1B26',
            }}
            placeholder="Ej: Laura"
            placeholderTextColor="#9B7A88"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Rol */}
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 20,
          padding: 16, marginBottom: 24,
          shadowColor: '#FF8AB3', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
        }}>
          <Text style={{ fontWeight: '800', fontSize: 13, color: '#9B7A88', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Tu Rol
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map((r) => {
              const isSelected = roleMode === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setRoleMode(r.id)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10,
                    borderRadius: 99, borderWidth: 2,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: isSelected ? '#FFE4EE' : '#FFF0F5',
                    borderColor: isSelected ? '#FF5C9A' : '#FFD6E8',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                  <Text style={{
                    fontWeight: '800',
                    color: isSelected ? '#FF5C9A' : '#9B7A88',
                  }}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <BigButton
          label="Siguiente →"
          disabled={!name.trim() || createProfile.isPending}
          loading={createProfile.isPending}
          onPress={handleNext}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
