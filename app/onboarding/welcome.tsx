import { View, Text, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/src/components/ui/BigButton';

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF8AB3' }}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />

      {/* Header decorativo */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 72, marginBottom: 8 }}>🌙</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
          Cielo App
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 17, textAlign: 'center', lineHeight: 26, fontWeight: '600' }}>
          Tu bitácora privada para el{'\n'}cuidado del bebé 👶
        </Text>
      </View>

      {/* Card inferior */}
      <View style={{
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: 28, paddingBottom: 36,
        gap: 16,
      }}>
        <View style={{ gap: 10 }}>
          {[
            ['💬', '100% offline', 'Tus datos nunca salen del dispositivo'],
            ['⚡', 'Super rápido', 'Registro en 2 taps, de noche y con una mano'],
            ['👥', 'Para dos', 'Papá y mamá ven el mismo historial en tiempo real'],
          ].map(([emoji, title, desc]) => (
            <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: '#2D1B26' }}>{title}</Text>
                <Text style={{ fontSize: 12, color: '#9B7A88', fontWeight: '600' }}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <BigButton label="Comenzar 🚀" onPress={() => router.push('/onboarding/role')} />
      </View>
    </SafeAreaView>
  );
}
