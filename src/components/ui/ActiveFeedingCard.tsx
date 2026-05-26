import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { formatDuration, calcDurationSec } from '@/src/db/client';
import {
  usePauseFeeding,
  useResumeFeeding,
  useFinishFeeding,
  useFeedingStatusEvents,
  FEEDING_LABELS,
  BOTTLE_SUBTYPE_LABELS,
} from '@/src/hooks/useFeedingSessions';
import type { FeedingSession } from '@/src/db/schema';
import { useTheme } from '@/src/theme/useTheme';
import { timeOptions } from '@/src/utils/timeFormat';

/**
 * Hook de timer preciso.
 *
 * Lógica:
 * - Carga los feedingStatusEvents reales de la sesión desde la DB.
 * - Calcula el tiempo ACTIVO acumulado hasta ahora:
 *     activoAcumulado = suma de intervalos (start/resume → pause/finish)
 * - Si la sesión está ACTIVA en este momento, agrega el tiempo transcurrido
 *   desde el último start/resume hasta ahora, actualizado cada segundo.
 * - Si está PAUSADA, muestra solo el acumulado fijo (sin ticker).
 */
function usePreciseElapsed(session: FeedingSession): number {
  const { data: events } = useFeedingStatusEvents(session.id);
  const [tick, setTick]  = useState(0);
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Arrancar/detener el ticker según status
  useEffect(() => {
    if (session.status === 'active') {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session.status]);

  if (!events || events.length === 0) return 0;

  // Calcular tiempo acumulado en segmentos cerrados (start/resume → pause/finish)
  let accumulated = 0;
  let lastActiveTs: number | null = null;

  for (const ev of events) {
    const ts = ev.timestamp instanceof Date ? ev.timestamp.getTime() : Number(ev.timestamp);
    if (ev.type === 'start' || ev.type === 'resume') {
      lastActiveTs = ts;
    } else if ((ev.type === 'pause' || ev.type === 'finish') && lastActiveTs !== null) {
      accumulated += (ts - lastActiveTs) / 1000;
      lastActiveTs = null;
    }
  }

  // Si la sesión está activa ahora, el segmento abierto sigue corriendo
  if (session.status === 'active' && lastActiveTs !== null) {
    accumulated += (Date.now() - lastActiveTs) / 1000;
  }

  return Math.floor(accumulated);
}

export function ActiveFeedingCard({ session }: { session: FeedingSession }) {
  const pause   = usePauseFeeding();
  const resume  = useResumeFeeding();
  const finish  = useFinishFeeding();
  const elapsed = usePreciseElapsed(session);
  const { theme } = useTheme(); const c = theme.colors;

  const isActive = session.status === 'active';
  const { emoji, label } = FEEDING_LABELS[session.type as keyof typeof FEEDING_LABELS];
  const subLabel = session.bottleSubtype
    ? BOTTLE_SUBTYPE_LABELS[session.bottleSubtype as keyof typeof BOTTLE_SUBTYPE_LABELS]?.label
    : null;

  const startTime = new Date(session.startedAt).toLocaleTimeString('es-MX', timeOptions());

  return (
    <View style={{
      backgroundColor: c.elevated,
      borderWidth: 2,
      borderColor: c.warning,
      borderRadius: 18,
      padding: 12,
      marginBottom: 6,
      shadowColor: c.warning,
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
            <Text style={{ fontWeight: '900', fontSize: 14, color: c.textBody }}>
              {label}{subLabel ? ` · ${subLabel}` : ''}
            </Text>
            <Text style={{ fontSize: 11, color: c.danger, fontWeight: '600' }}>
              Inició a las {startTime}
            </Text>
          </View>
        </View>

        {/* Timer — muestra solo tiempo activo real */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: c.textBody, letterSpacing: -0.5 }}>
            {formatDuration(elapsed)}
          </Text>
          <View style={{
            backgroundColor: isActive ? c.success + '20' : c.warning + '20',
            paddingHorizontal: 8, paddingVertical: 2,
            borderRadius: 99, marginTop: 2,
          }}>
            <Text style={{
              fontSize: 10, fontWeight: '800',
              color: isActive ? c.success : c.warning,
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
            disabled={pause.isPending || resume.isPending || finish.isPending}
            style={{
              flex: 1, backgroundColor: c.warning + '20',
              borderRadius: 12, paddingVertical: 10,
              alignItems: 'center',
              opacity: pause.isPending ? 0.6 : 1,
            }}
          >
            {pause.isPending
              ? <ActivityIndicator size="small" color={c.warning} />
              : <Text style={{ color: c.warning, fontWeight: '800', fontSize: 13 }}>⏸ Pausar</Text>
            }
          </TouchableOpacity>
        )}

        {!isActive && (
          <TouchableOpacity
            onPress={() => resume.mutate(session)}
            disabled={pause.isPending || resume.isPending || finish.isPending}
            style={{
              flex: 1, backgroundColor: c.success + '20',
              borderRadius: 12, paddingVertical: 10,
              alignItems: 'center',
              opacity: resume.isPending ? 0.6 : 1,
            }}
          >
            {resume.isPending
              ? <ActivityIndicator size="small" color={c.success} />
              : <Text style={{ color: c.success, fontWeight: '800', fontSize: 13 }}>▶ Continuar</Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => finish.mutate(session)}
          disabled={pause.isPending || resume.isPending || finish.isPending}
          style={{
            flex: 1, backgroundColor: c.danger + '20',
            borderRadius: 12, paddingVertical: 10,
            alignItems: 'center',
            opacity: finish.isPending ? 0.6 : 1,
          }}
        >
          {finish.isPending
            ? <ActivityIndicator size="small" color={c.danger} />
            : <Text style={{ color: c.danger, fontWeight: '800', fontSize: 13 }}>✓ Terminar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
