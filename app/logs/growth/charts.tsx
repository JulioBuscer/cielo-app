import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '@/src/db/client';
import { growthLogs } from '@/src/db/schema';
import { useActiveBaby, calcAge } from '@/src/hooks/useBaby';
import { useTheme } from '@/src/theme/useTheme';
import { GrowthPercentileChart } from '@/src/growth/GrowthPercentileChart';
import { calcPercentile, calcPercentileLabel } from '@/src/growth/percentiles';
import type { GrowthMetric } from '@/src/growth/whoData';

const METRICS: { key: GrowthMetric; label: string; emoji: string; color: string }[] = [
  { key: 'weight', label: 'Peso', emoji: '⚖️', color: '#4CAF50' },
  { key: 'height', label: 'Talla', emoji: '📏', color: '#FF9800' },
  { key: 'headCircumference', label: 'CC', emoji: '📐', color: '#AB47BC' },
];

export default function GrowthChartsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { data: baby } = useActiveBaby();
  const [metric, setMetric] = useState<GrowthMetric>('weight');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['growth-charts', baby?.id],
    enabled: !!baby?.id,
    queryFn: async () => {
      if (!baby?.id) return [];
      return getDb()
        .select()
        .from(growthLogs)
        .where(eq(growthLogs.babyId, baby.id))
        .orderBy(desc(growthLogs.timestamp));
    },
  });

  const birthDate = baby?.birthDate ? new Date(baby.birthDate) : null;
  const sex = baby?.sex ?? 'unknown';

  const babyData = useMemo(() => {
    if (!logs || !birthDate) return [];
    const pts: { label: string; ageMonths: number; value: number }[] = [];

    if (metric === 'weight' && baby?.weightBirthGrams) {
      pts.push({ label: 'Nac.', ageMonths: 0, value: baby.weightBirthGrams / 1000 });
    }
    if (metric === 'height' && baby?.heightBirthMm) {
      pts.push({ label: 'Nac.', ageMonths: 0, value: baby.heightBirthMm / 10 });
    }

    for (const log of logs) {
      const ts = new Date(log.timestamp);
      const ageMs = ts.getTime() - birthDate.getTime();
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
      let value: number | null = null;
      if (metric === 'weight' && log.weightGrams) value = log.weightGrams / 1000;
      if (metric === 'height' && log.heightMm) value = log.heightMm / 10;
      if (metric === 'headCircumference' && log.headCircMm) value = log.headCircMm / 10;
      if (value !== null) {
        pts.push({
          label: ts.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
          ageMonths: Math.round(ageMonths * 10) / 10,
          value,
        });
      }
    }
    return pts.sort((a, b) => a.ageMonths - b.ageMonths);
  }, [logs, birthDate, metric, baby]);

  const currentMetric = METRICS.find((m) => m.key === metric)!;
  const hasData = babyData.length > 0;
  const lastPoint = babyData[babyData.length - 1];

  const percentileInfo = useMemo(() => {
    if (!lastPoint || !baby?.sex || baby.sex === 'unknown') return null;
    return calcPercentile(baby.sex, metric, lastPoint.ageMonths, lastPoint.value);
  }, [lastPoint, baby?.sex, metric]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={['top']}>
      <Stack.Screen options={{ title: 'Curvas OMS', headerShown: false }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, color: c.textBody }}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '900', color: c.textBody }}>📈 Curvas OMS</Text>
          <View style={{ width: 30 }} />
        </View>

        {baby && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.textMuted, marginTop: -8 }}>
            {baby.nickname || baby.name} · {calcAge(baby.birthDate).label}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {METRICS.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMetric(m.key)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 99,
                backgroundColor: metric === m.key ? m.color : c.card,
                alignItems: 'center', borderWidth: 1,
                borderColor: metric === m.key ? m.color : c.elevated,
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: '700',
                color: metric === m.key ? '#fff' : c.textBody,
              }}>
                {m.emoji} {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {isLoading ? (
          <ActivityIndicator color={c.accent} style={{ padding: 40 }} />
        ) : !baby || !baby.sex || baby.sex === 'unknown' ? (
          <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.elevated }}>
            <Text style={{ fontSize: 32 }}>{!baby ? '👶' : '❓'}</Text>
            <Text style={{ color: c.textMuted, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>
              {!baby ? 'Configura un bebé en Perfil' : 'Define el sexo del bebé en Perfil para ver curvas OMS'}
            </Text>
          </View>
        ) : (
          <>
            {percentileInfo && (
              <View style={{
                backgroundColor: c.card, borderRadius: 16, padding: 16,
                flexDirection: 'row', justifyContent: 'space-around',
                borderWidth: 1, borderColor: c.elevated,
              }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: currentMetric.color }}>
                    P{Math.round(percentileInfo.percentile)}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>
                    Percentil
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: c.textBody }}>
                    {lastPoint.value.toFixed(metric === 'weight' ? 2 : 1)}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>
                    {metric === 'weight' ? 'kg' : 'cm'}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: c.textBody }}>
                    {lastPoint.ageMonths.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>
                    meses
                  </Text>
                </View>
              </View>
            )}

            <GrowthPercentileChart
              sex={baby.sex as 'male' | 'female'}
              metric={metric}
              babyData={babyData}
              color={currentMetric.color}
              noData="Registra mediciones desde Inicio › Medir"
            />

            {hasData && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: c.textBody }}>
                  Historial
                </Text>
                {babyData.slice().reverse().map((pt, i) => {
                  const p = baby?.sex && baby.sex !== 'unknown' ? calcPercentile(baby.sex as 'male' | 'female', metric, pt.ageMonths, pt.value) : null;
                  return (
                    <View key={i} style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      backgroundColor: c.card, borderRadius: 12, padding: 12,
                      borderWidth: 1, borderColor: c.elevated,
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: c.textBody }}>
                          {pt.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>
                          {pt.ageMonths.toFixed(1)} meses
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: c.textBody }}>
                        {pt.value.toFixed(metric === 'weight' ? 2 : 1)} {metric === 'weight' ? 'kg' : 'cm'}
                      </Text>
                      {p && (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: currentMetric.color, marginLeft: 8 }}>
                          P{Math.round(p.percentile)}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={{ fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 8 }}>
              Basado en estándares OMS 2006 · Curvas P3/P15/P50/P85/P97
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
