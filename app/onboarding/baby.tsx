import { useState } from 'react';
import { Text, TextInput, View, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/src/components/ui/BigButton';
import { useCreateBaby } from '@/src/hooks/useBaby';

export default function BabySetup() {
  const [name, setName] = useState('');
  const createBaby      = useCreateBaby();

  const handleFinish = () => {
    if (!name.trim()) return;
    createBaby.mutate(
      { name: name.trim(), birthDate: new Date() },
      { onSuccess: () => router.replace('/dashboard') }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF8AB3' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />

      <View style={{
        paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center',
      }}>
        <Text style={{ fontSize: 48, marginBottom: 4 }}>👶</Text>
        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22 }}>El Bebé</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginTop: 4 }}>
          ¿A quién vas a cuidar hoy?
        </Text>
      </View>

      <View style={{
        flex: 1, backgroundColor: '#FFF0F5',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingTop: 28, gap: 20,
      }}>
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 20,
          padding: 16,
          shadowColor: '#FF8AB3', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
        }}>
          <Text style={{ fontWeight: '800', fontSize: 13, color: '#9B7A88', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Nombre o Apodo
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFF0F5', borderRadius: 12,
              padding: 14, fontSize: 18, color: '#2D1B26',
            }}
            placeholder="Ej: Emiliano"
            placeholderTextColor="#9B7A88"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <BigButton
          label="¡Comenzar! ✨"
          disabled={!name.trim() || createBaby.isPending}
          loading={createBaby.isPending}
          onPress={handleFinish}
        />
      </View>
    </SafeAreaView>
  );
}
