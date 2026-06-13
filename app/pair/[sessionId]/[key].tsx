import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';
import { useSyncContext } from '@/src/sync/SyncProvider';

export default function PairScreen() {
  const { sessionId, key } = useLocalSearchParams<{ sessionId: string; key: string }>();
  const { theme } = useTheme();
  const c = theme.colors;
  const sync = useSyncContext();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || !key) {
      router.replace('/');
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    sync.startJoin({ v: 2, key, device: '', sessionId });
  }, [sessionId, key]);

  useEffect(() => {
    if (sync.step === 'done') {
      const t = setTimeout(() => router.replace('/'), 3000);
      return () => clearTimeout(t);
    }
    if (sync.step === 'error') {
      const t = setTimeout(() => router.replace('/'), 5000);
      return () => clearTimeout(t);
    }
  }, [sync.step]);

  const STEP_LABELS: Record<string, string> = {
    idle: 'Listo',
    signaling: 'Conectando...',
    connecting_webrtc: 'Estableciendo conexión segura...',
    syncing: 'Sincronizando datos...',
    merging: 'Fusionando registros...',
    done: '¡Sincronizado!',
    error: 'Error',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surface, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 48 }}>🌙</Text>
        <Text style={{ color: c.textBody, fontWeight: '900', fontSize: 18, textAlign: 'center' }}>
          Conectando con otro dispositivo...
        </Text>
        {sync.step !== 'done' && sync.step !== 'error' && (
          <ActivityIndicator size="large" color={c.accentStrong} />
        )}
        <Text style={{ color: c.textMuted, fontSize: 14 }}>
          {STEP_LABELS[sync.step] ?? sync.step}
        </Text>
        {sync.step === 'done' && (
          <Text style={{ color: '#4CAF50', fontWeight: '700', fontSize: 15 }}>
            {sync.mergedCount} registros sincronizados
          </Text>
        )}
        {sync.step === 'error' && (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#F44336', fontSize: 14 }}>{sync.error}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>Redirigiendo...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
