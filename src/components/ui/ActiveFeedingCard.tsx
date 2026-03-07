import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { formatDuration } from '@/src/db/client';
import {
  usePauseFeeding,
  useResumeFeeding,
  useFinishFeeding,
  FEEDING_LABELS,
  BOTTLE_SUBTYPE_LABELS,
} from '@/src/hooks/useFeedingSessions';
import type { FeedingSession } from '@/src/db/schema';

function useLiveElapsed(session: FeedingSession) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      setSecs(elapsed);
    };
    update();
    if (session.status === 'active') {
      const id = setInterval(update, 1000);
      return () => clearInterval(id);
    }
  }, [session.startedAt, session.status]);

  return secs;
}

export function ActiveFeedingCard({ session }: { session: FeedingSession }) {
  const pause   = usePauseFeeding();
  const resume  = useResumeFeeding();
  const finish  = useFinishFeeding();
  const elapsed = useLiveElapsed(session);

  const isActive = session.status === 'active';
  const { emoji, label } = FEEDING_LABELS[session.type as keyof typeof FEEDING_LABELS];
  const subLabel = session.bottleSubtype
    ? BOTTLE_SUBTYPE_LABELS[session.bottleSubtype as keyof typeof BOTTLE_SUBTYPE_LABELS]?.label
    : null;

  const startTime = new Date(session.startedAt).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={{
      backgroundColor: '#FFF3E0',
      borderWidth: 2,
      borderColor: '#FFB74D',
      borderRadius: 18,
      padding: 12,
      marginBottom: 6,
      shadowColor: '#FFB74D',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 26 }}>{emoji}</Text>
          <View>
            <Text style={{ fontWeight: '900', fontSize: 14, color: '#E65100' }}>
              {label}{subLabel ? ` · ${subLabel}` : ''}
            </Text>
            <Text style={{ fontSize: 11, color: '#BF360C', fontWeight: '600' }}>
              Inició a las {startTime}
            </Text>
          </View>
        </View>

        {/* Timer */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#E65100', letterSpacing: -0.5 }}>
            {formatDuration(elapsed)}
          </Text>
          <View style={{
            backgroundColor: isActive ? '#D4EDDA' : '#FFF3CD',
            paddingHorizontal: 8, paddingVertical: 2,
            borderRadius: 99, marginTop: 2,
          }}>
            <Text style={{
              fontSize: 10, fontWeight: '800',
              color: isActive ? '#155724' : '#856404',
            }}>
              {isActive ? '● EN CURSO' : '⏸ PAUSADA'}
            </Text>
          </View>
        </View>
      </View>

      {/* Botones */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {isActive && (
          <TouchableOpacity
            onPress={() => pause.mutate(session)}
            disabled={pause.isPending}
            style={{
              flex: 1, backgroundColor: '#FFF3CD',
              borderRadius: 12, paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            {pause.isPending
              ? <ActivityIndicator size="small" color="#856404" />
              : <Text style={{ color: '#856404', fontWeight: '800', fontSize: 13 }}>⏸ Pausar</Text>
            }
          </TouchableOpacity>
        )}

        {!isActive && (
          <TouchableOpacity
            onPress={() => resume.mutate(session)}
            disabled={resume.isPending}
            style={{
              flex: 1, backgroundColor: '#D4EDDA',
              borderRadius: 12, paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            {resume.isPending
              ? <ActivityIndicator size="small" color="#155724" />
              : <Text style={{ color: '#155724', fontWeight: '800', fontSize: 13 }}>▶ Continuar</Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => finish.mutate(session)}
          disabled={finish.isPending}
          style={{
            flex: 1, backgroundColor: '#FEE2E2',
            borderRadius: 12, paddingVertical: 10,
            alignItems: 'center',
            opacity: finish.isPending ? 0.7 : 1,
          }}
        >
          {finish.isPending
            ? <ActivityIndicator size="small" color="#DC2626" />
            : <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 13 }}>✓ Terminar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
