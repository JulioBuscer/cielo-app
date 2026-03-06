import '../global.css';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { runMigrations } from '@/src/db/client';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runMigrations()
      .then(() => setReady(true))
      .catch((e: any) => {
        console.error('Migration error:', e);
        setError(e?.message ?? 'Error al iniciar base de datos');
      });
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#FF4757', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
          Error al iniciar
        </Text>
        <Text style={{ color: '#F0EFF5', fontSize: 12, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#7C5CBF', fontSize: 24, marginBottom: 16 }}>🌙</Text>
        <ActivityIndicator color="#7C5CBF" size="large" />
        <Text style={{ color: '#6B6880', marginTop: 12, fontSize: 14 }}>
          Iniciando Cielo...
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
