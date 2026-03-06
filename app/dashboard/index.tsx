import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeScreen } from '@/src/components/layout/SafeScreen';
import { BigButton } from '@/src/components/ui/BigButton';
import { useActiveBaby } from '@/src/hooks/useBaby';
import { useLastDiaperLog } from '@/src/hooks/useDiaperLogs';
import { useLastFeedingLog } from '@/src/hooks/useFeedingLogs';
import { useLastGrowthLog, gramsToKg, mmToCm } from '@/src/hooks/useGrowthLogs';

function timeAgo(date: Date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function Dashboard() {
  const { data: baby }          = useActiveBaby();
  const { data: lastDiaper }    = useLastDiaperLog(baby?.id);
  const { data: lastFeeding }   = useLastFeedingLog(baby?.id);
  const { data: lastGrowth }    = useLastGrowthLog(baby?.id);

  return (
    <SafeScreen>
      {/* Header */}
      <View className="flex-row items-center justify-between py-4">
        <Text className="text-white text-2xl font-bold">🌙 {baby?.name ?? 'Cielo'}</Text>
        <TouchableOpacity onPress={() => router.push('/logs/growth/history')}>
          <Text className="text-growth text-sm">📈 Curva</Text>
        </TouchableOpacity>
      </View>

      {/* Status cards */}
      <View className="gap-3 mb-6">
        <View className="bg-bgCard rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-textMuted">💧 Último pañal</Text>
          <Text className="text-textPrimary font-bold">
            {lastDiaper ? timeAgo(new Date(lastDiaper.timestamp)) : 'Sin registros'}
          </Text>
        </View>
        <View className="bg-bgCard rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-textMuted">🍼 Última toma</Text>
          <Text className="text-textPrimary font-bold">
            {lastFeeding ? timeAgo(new Date(lastFeeding.timestamp)) : 'Sin registros'}
          </Text>
        </View>
        <View className="bg-bgCard rounded-2xl p-4 flex-row items-center justify-between">
          <Text className="text-textMuted">📏 Último peso</Text>
          <Text className="text-growth font-bold">
            {lastGrowth?.weightGrams
              ? `${gramsToKg(lastGrowth.weightGrams)} kg`
              : '—'
            }
            {lastGrowth?.heightMm
              ? `  ·  ${mmToCm(lastGrowth.heightMm)} cm`
              : ''}
          </Text>
        </View>
      </View>

      {/* Botones de acción — mínimo 56px para uso nocturno */}
      <View className="gap-3 flex-1 justify-end pb-6">
        <BigButton label="💩  Registrar Pañal"
          onPress={() => router.push('/logs/diaper/new')} variant="primary" />
        <BigButton label="🍼  Registrar Toma"
          onPress={() => router.push('/logs/feeding/new')} variant="secondary" />
        <BigButton label="📏  Peso / Estatura"
          onPress={() => router.push('/logs/growth/new')} variant="growth" />
        <BigButton label="📋  Generar Reporte"
          onPress={() => router.push('/report/generate')} variant="ghost" />
      </View>
    </SafeScreen>
  );
}
