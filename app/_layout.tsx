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
    // TODO: quitar este reset cuando el schema esté estable
    // Solo resetea si venimos del schema viejo (no tiene event_types)
    const migrate = async () => {
      const SQLite = await import('expo-sqlite');
      const db = SQLite.openDatabaseSync('cielo.db');
      try {
        await db.execAsync(`SELECT * FROM event_types LIMIT 1`);
      } catch {
        // Tabla no existe → schema viejo, borrar todo
        await db.execAsync(`
          DROP TABLE IF EXISTS diaper_logs;
          DROP TABLE IF EXISTS feeding_logs;
          DROP TABLE IF EXISTS growth_logs;
          DROP TABLE IF EXISTS timeline_events;
          DROP TABLE IF EXISTS feeding_status_events;
          DROP TABLE IF EXISTS feeding_sessions;
          DROP TABLE IF EXISTS diaper_observations;
          DROP TABLE IF EXISTS event_types;
          DROP TABLE IF EXISTS babies;
          DROP TABLE IF EXISTS profiles;
        `);
      }
    };

    migrate()
      .then(() => runMigrations())
      .then(() => setReady(true))
      .catch((e: any) => {
        console.error('Migration error:', e);
        setError(e?.message ?? 'Error al iniciar base de datos');
      });
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FF8AB3', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
          Error al iniciar
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FF8AB3', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#7C5CBF', fontSize: 24, marginBottom: 16 }}>🌙</Text>
        <ActivityIndicator color="#FFFFFF" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 12, fontSize: 14 }}>
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
