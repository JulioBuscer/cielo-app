import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { formatDuration } from '@/src/db/client';
import {
  usePauseSleep, useResumeSleep, useFinishSleep,
  useSleepPreciseElapsed,
} from '@/src/hooks/useSleepSessions';
import type { SleepSession } from '@/src/db/schema';

export function ActiveSleepCard({ session }: { session: SleepSession }) {
  const pause   = usePauseSleep();
  const resume  = useResumeSleep();
  const finish  = useFinishSleep();
  const elapsed = useSleepPreciseElapsed(session);

  const isActive = session.status === 'active';
  const startTime = new Date(session.startedAt).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  });

  const busy = pause.isPending || resume.isPending || finish.isPending;

  return (
    <View style={{
      backgroundColor: '#EEF2FF',
      borderWidth: 2, borderColor: '#818CF8',
      borderRadius: 18, padding: 12, marginBottom: 6,
      shadowColor: '#818CF8', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 26 }}>😴</Text>
          <View>
            <Text style={{ fontWeight: '900', fontSize: 14, color: '#3730A3' }}>
              Sesión de Sueño
            </Text>
            <Text style={{ fontSize: 11, color: '#4338CA', fontWeight: '600' }}>
              Inició a las {startTime}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#3730A3', letterSpacing: -0.5 }}>
            {formatDuration(elapsed)}
          </Text>
          <View style={{
            backgroundColor: isActive ? '#C7D2FE' : '#E0E7FF',
            paddingHorizontal: 8, paddingVertical: 2,
            borderRadius: 99, marginTop: 2,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? '#3730A3' : '#6366F1' }}>
              {isActive ? '💤 DURMIENDO' : '⏸ PAUSADO'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {isActive ? (
          <TouchableOpacity
            onPress={() => pause.mutate(session)}
            disabled={busy}
            style={{ flex: 1, backgroundColor: '#E0E7FF', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
          >
            {pause.isPending
              ? <ActivityIndicator size="small" color="#4338CA" />
              : <Text style={{ color: '#4338CA', fontWeight: '800', fontSize: 13 }}>⏸ Pausar</Text>
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => resume.mutate(session)}
            disabled={busy}
            style={{ flex: 1, backgroundColor: '#C7D2FE', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
          >
            {resume.isPending
              ? <ActivityIndicator size="small" color="#3730A3" />
              : <Text style={{ color: '#3730A3', fontWeight: '800', fontSize: 13 }}>▶ Continuar</Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => finish.mutate(session)}
          disabled={busy}
          style={{ flex: 1, backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 10, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
        >
          {finish.isPending
            ? <ActivityIndicator size="small" color="#DC2626" />
            : <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 13 }}>✓ Despertar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
