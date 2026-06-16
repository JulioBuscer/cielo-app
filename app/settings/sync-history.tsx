import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { desc } from 'drizzle-orm';
import { useTheme } from '@/src/theme/useTheme';
import { getDb } from '@/src/db/client';
import { syncHistory, type SyncHistory } from '@/src/db/schema';

function formatTime(ts: Date | number): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${mins}`;
}

function formatEntriesLog(entries: SyncHistory[]): string {
  const lines = entries.map((e) => {
    const meta = STATUS_META[e.status] ?? STATUS_META.error;
    const dir = e.direction === 'sent' ? '📤' : '📥';
    const time = formatTime(e.createdAt);
    const conflict = (e.recordsConflicted ?? 0) > 0 ? ` conflictos=${e.recordsConflicted}` : '';
    const err = e.errorMessage ? ` error=${e.errorMessage}` : '';
    return `${dir} ${time} ${meta.emoji} ${e.direction} registros=${e.recordsSynced}${conflict}${err}`;
  });
  return `Sync History (${entries.length} entries)\n${'='.repeat(40)}\n${lines.join('\n')}`;
}

const STATUS_META: Record<string, { label: string; color: string; emoji: string }> = {
  success:  { label: 'Éxito',  color: '#4CAF50', emoji: '✅' },
  conflict: { label: 'Conflictos', color: '#FF9800', emoji: '⚠️' },
  error:    { label: 'Error',  color: '#F44336', emoji: '❌' },
};

export default function SyncHistoryScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [entries, setEntries] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getDb()
        .select()
        .from(syncHistory)
        .orderBy(desc(syncHistory.createdAt))
        .limit(100);
      setEntries(result as SyncHistory[]);
    } catch {}
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const copyLogs = useCallback(async () => {
    const log = formatEntriesLog(entries);
    await Clipboard.setStringAsync(log);
    if (Platform.OS === 'web') {
      alert('Logs copiados al portapapeles');
    } else {
      Alert.alert('📋 Copiado', 'Logs de sincronización copiados al portapapeles');
    }
  }, [entries]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />

      <View
        style={{
          backgroundColor: c.headerBg,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 16, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: c.headerText, fontSize: 26, lineHeight: 28 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.headerText, fontWeight: '900', fontSize: 18, flex: 1 }}>
          📋 Historial de sincronización
        </Text>
        {entries.length > 0 && (
          <TouchableOpacity
            onPress={copyLogs}
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }}
          >
            <Text style={{ color: c.headerText, fontSize: 15, fontWeight: '700' }}>📋 Copiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: c.surface }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accentStrong} />}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={c.accentStrong} />
          </View>
        ) : entries.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 48 }}>🔄</Text>
            <Text style={{ color: c.textMuted, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
              No hay sincronizaciones aún
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center' }}>
              Las sincronizaciones aparecerán aquí automáticamente después de cada sesión.
            </Text>
          </View>
        ) : (
          entries.map((entry) => {
            const meta = STATUS_META[entry.status] ?? STATUS_META.error;
            return (
              <View
                key={entry.id}
                style={{
                  backgroundColor: c.card,
                  borderRadius: 16,
                  padding: 14,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 22 }}>
                    {entry.direction === 'sent' ? '📤' : '📥'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textBody, fontWeight: '800', fontSize: 15 }}>
                      {entry.direction === 'sent' ? 'Enviado' : 'Recibido'}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600', marginTop: 1 }}>
                      {formatTime(entry.createdAt)}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: meta.color + '20',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <Text style={{ fontSize: 12 }}>{meta.emoji}</Text>
                    <Text style={{ color: meta.color, fontWeight: '700', fontSize: 12 }}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>
                    📦 {entry.recordsSynced} registros
                  </Text>
                  {(entry.recordsConflicted ?? 0) > 0 && (
                    <Text style={{ color: '#FF9800', fontSize: 12, fontWeight: '700' }}>
                      ⚠️ {entry.recordsConflicted} conflictos
                    </Text>
                  )}
                  {entry.errorMessage && (
                    <Text style={{ color: '#F44336', fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                      {entry.errorMessage}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
