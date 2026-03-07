import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveBaby } from '@/src/hooks/useBaby';
import {
  useActiveFeedingSession,
  useLastFeedingSession,
  useStartFeeding,
  type FeedingType,
  type BottleSubtype,
  FEEDING_LABELS,
} from '@/src/hooks/useFeedingSessions';
import { useLastTimelineEventByType } from '@/src/hooks/useTimeline';
import { ActiveFeedingCard } from '@/src/components/ui/ActiveFeedingCard';
import { BottleSubtypeModal } from '@/src/components/ui/BottleSubtypeModal';
import { formatDuration } from '@/src/db/client';

function timeAgo(date: Date | string | number) {
  const d = date instanceof Date ? date : new Date(date);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

// ─── BOTÓN DE INICIO RÁPIDO ───────────────────────────────────────────────────

function QuickStartBtn({
  emoji, label, sublabel, onPress, disabled, loading, color = 'border-cielo',
}: {
  emoji: string; label: string; sublabel?: string;
  onPress: () => void; disabled?: boolean; loading?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-1 bg-bgElevated border-2 ${color} rounded-2xl py-5 items-center justify-center min-h-[90px]`}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      {loading
        ? <ActivityIndicator color="#7C5CBF" />
        : <>
            <Text className="text-3xl mb-1">{emoji}</Text>
            <Text className="text-textPrimary font-bold text-sm text-center">{label}</Text>
            {sublabel && <Text className="text-textMuted text-xs mt-0.5">{sublabel}</Text>}
          </>
      }
    </TouchableOpacity>
  );
}

// ─── CARD DE RESUMEN ──────────────────────────────────────────────────────────

function SummaryCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View className="flex-1 bg-bgCard rounded-2xl p-3 items-center">
      <Text className="text-xl mb-1">{emoji}</Text>
      <Text className="text-textMuted text-xs mb-0.5">{label}</Text>
      <Text className="text-textPrimary font-bold text-sm text-center">{value}</Text>
    </View>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [loadingType, setLoadingType]         = useState<FeedingType | null>(null);

  const { data: baby }          = useActiveBaby();
  const { data: activeSession } = useActiveFeedingSession(baby?.id);
  const { data: lastFeeding }   = useLastFeedingSession(baby?.id);
  const { data: lastDiaper }    = useLastTimelineEventByType(baby?.id, 'diaper');
  const startFeeding            = useStartFeeding();

  const hasActiveSession = !!activeSession;

  const handleStartFeeding = async (type: FeedingType, bottleSubtype?: BottleSubtype) => {
    if (!baby) return;
    setLoadingType(type);
    try {
      await startFeeding.mutateAsync({ babyId: baby.id, type, bottleSubtype });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Header ── */}
        <View className="flex-row items-center justify-between py-4 mb-2">
          <View>
            <Text className="text-textMuted text-xs uppercase tracking-widest">Cuidando a</Text>
            <Text className="text-textPrimary text-2xl font-bold">🌙 {baby?.name ?? '...'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/timeline')}
            className="bg-bgCard px-4 py-2 rounded-full"
          >
            <Text className="text-cielo text-sm font-semibold">📋 Timeline</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tarjeta de toma activa ── */}
        {activeSession && <ActiveFeedingCard session={activeSession} />}

        {/* ── Resumen rápido ── */}
        <View className="flex-row gap-3 mb-6">
          <SummaryCard
            emoji="🍑"
            label="Último pañal"
            value={lastDiaper ? timeAgo(lastDiaper.timestamp) : 'Sin registros'}
          />
          <SummaryCard
            emoji={lastFeeding ? FEEDING_LABELS[lastFeeding.type as FeedingType]?.emoji ?? '🍼' : '🍼'}
            label="Última toma"
            value={lastFeeding
              ? `${timeAgo(lastFeeding.startedAt)}${lastFeeding.durationSec ? ` · ${formatDuration(lastFeeding.durationSec)}` : ''}`
              : 'Sin registros'
            }
          />
        </View>

        {/* ── Inicio de toma ── */}
        <Text className="text-textMuted text-xs uppercase tracking-widest mb-3">
          {hasActiveSession ? 'Iniciar nueva toma (termina la actual)' : 'Iniciar Toma'}
        </Text>
        <View className="flex-row gap-3 mb-6">
          <QuickStartBtn
            emoji="🤱" label="Pecho" sublabel="Izq."
            loading={loadingType === 'breast_left'}
            disabled={!!loadingType}
            onPress={() => handleStartFeeding('breast_left')}
          />
          <QuickStartBtn
            emoji="🤱" label="Pecho" sublabel="Der."
            loading={loadingType === 'breast_right'}
            disabled={!!loadingType}
            onPress={() => handleStartFeeding('breast_right')}
          />
          <QuickStartBtn
            emoji="🍼" label="Biberón"
            loading={loadingType === 'bottle'}
            disabled={!!loadingType}
            color="border-growth"
            onPress={() => setShowBottleModal(true)}
          />
        </View>

        {/* ── Acciones secundarias ── */}
        <Text className="text-textMuted text-xs uppercase tracking-widest mb-3">Registrar Evento</Text>
        <View className="gap-3">
          <TouchableOpacity
            onPress={() => router.push('/logs/diaper/new')}
            className="bg-bgCard flex-row items-center gap-4 px-5 py-4 rounded-2xl"
          >
            <Text className="text-3xl">🍑</Text>
            <View className="flex-1">
              <Text className="text-textPrimary font-bold">Cambio de Pañal</Text>
              <Text className="text-textMuted text-xs">
                {lastDiaper ? `Último: ${timeAgo(lastDiaper.timestamp)}` : 'Sin registros hoy'}
              </Text>
            </View>
            <Text className="text-textMuted text-lg">›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/logs/event/new')}
            className="bg-bgCard flex-row items-center gap-4 px-5 py-4 rounded-2xl"
          >
            <Text className="text-3xl">📝</Text>
            <View className="flex-1">
              <Text className="text-textPrimary font-bold">Otro Evento</Text>
              <Text className="text-textMuted text-xs">Eructo, medicamento, temperatura…</Text>
            </View>
            <Text className="text-textMuted text-lg">›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/logs/feeding/retro')}
            className="bg-bgCard flex-row items-center gap-4 px-5 py-4 rounded-2xl"
          >
            <Text className="text-3xl">⏱</Text>
            <View className="flex-1">
              <Text className="text-textPrimary font-bold">Toma Rezagada</Text>
              <Text className="text-textMuted text-xs">Registrar una toma pasada completa</Text>
            </View>
            <Text className="text-textMuted text-lg">›</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Modal biberón ── */}
      <BottleSubtypeModal
        visible={showBottleModal}
        onClose={() => setShowBottleModal(false)}
        onSelect={(subtype) => {
          setShowBottleModal(false);
          handleStartFeeding('bottle', subtype);
        }}
      />
    </SafeAreaView>
  );
}
