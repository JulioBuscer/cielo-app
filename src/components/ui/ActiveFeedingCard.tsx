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

function useLiveDuration(session: FeedingSession) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    // Calcular cuánto tiempo lleva activa desde startedAt
    // (aproximación sin sumar pausas históricas — suficiente para el timer en vivo)
    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      setSecs(elapsed);
    };
    update();
    if (session.status === 'active') {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [session.startedAt, session.status]);

  return secs;
}

export function ActiveFeedingCard({ session }: { session: FeedingSession }) {
  const pause   = usePauseFeeding();
  const resume  = useResumeFeeding();
  const finish  = useFinishFeeding();
  const elapsed = useLiveDuration(session);

  const isActive = session.status === 'active';
  const isPaused = session.status === 'paused';
  const { emoji, label } = FEEDING_LABELS[session.type as keyof typeof FEEDING_LABELS];
  const subLabel = session.bottleSubtype
    ? BOTTLE_SUBTYPE_LABELS[session.bottleSubtype as keyof typeof BOTTLE_SUBTYPE_LABELS]?.label
    : null;

  return (
    <View className="bg-bgElevated border border-cielo rounded-2xl p-4 mb-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl">{emoji}</Text>
          <View>
            <Text className="text-textPrimary font-bold text-base">
              {label}{subLabel ? ` · ${subLabel}` : ''}
            </Text>
            <Text className="text-textMuted text-xs">
              Inició {new Date(session.startedAt).toLocaleTimeString('es-MX', {
                hour: '2-digit', minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Timer */}
        <View className="items-end">
          <Text className="text-cielo text-2xl font-bold font-mono">
            {formatDuration(elapsed)}
          </Text>
          <View className={`px-2 py-0.5 rounded-full ${isActive ? 'bg-green-900' : 'bg-yellow-900'}`}>
            <Text className={`text-xs font-bold ${isActive ? 'text-green-400' : 'text-yellow-400'}`}>
              {isActive ? '● EN CURSO' : '⏸ PAUSADA'}
            </Text>
          </View>
        </View>
      </View>

      {/* Botones */}
      <View className="flex-row gap-2">
        {isActive && (
          <TouchableOpacity
            onPress={() => pause.mutate(session)}
            disabled={pause.isPending}
            className="flex-1 bg-yellow-900 rounded-xl py-3 items-center"
          >
            {pause.isPending
              ? <ActivityIndicator size="small" color="#fbbf24" />
              : <Text className="text-yellow-400 font-bold">⏸ Pausar</Text>}
          </TouchableOpacity>
        )}

        {isPaused && (
          <TouchableOpacity
            onPress={() => resume.mutate(session)}
            disabled={resume.isPending}
            className="flex-1 bg-green-900 rounded-xl py-3 items-center"
          >
            {resume.isPending
              ? <ActivityIndicator size="small" color="#4ade80" />
              : <Text className="text-green-400 font-bold">▶ Continuar</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => finish.mutate(session)}
          disabled={finish.isPending}
          className="flex-1 bg-danger rounded-xl py-3 items-center"
          style={{ opacity: finish.isPending ? 0.7 : 1 }}
        >
          {finish.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="text-white font-bold">✓ Terminar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
