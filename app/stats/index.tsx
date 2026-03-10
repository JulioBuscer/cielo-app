/**
 * app/stats/index.tsx — Estadísticas completas de Cielo
 *
 * Filtros: Día / Semana / Mes / Año
 * Comparación vs período anterior
 * Gráficas: BarChart (tomas), AreaChart (sueño + pañales), GrowthLineChart
 */
import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveBaby } from '@/src/hooks/useBaby';
import { useStats, getRangeBounds, type RangeType } from '@/src/hooks/useStats';
import { useChartData } from '@/src/hooks/useChartData';
import { shareReport } from '@/src/utils/shareReport';
import { formatDuration } from '@/src/db/client';
import { BarChart }        from '@/src/components/charts/BarChart';
import { AreaChart }       from '@/src/components/charts/AreaChart';
import { GrowthLineChart } from '@/src/components/charts/GrowthLineChart';

// ─── Colores ──────────────────────────────────────────────────────────────────
const C = {
  feed:   '#FF5C9A',
  sleep:  '#6366F1',
  diaper: '#F59E0B',
  other:  '#10B981',
  weight: '#10B981',
  height: '#3B82F6',
  head:   '#8B5CF6',
  text:   '#1F2937',
  muted:  '#6B7280',
  bg:     '#F9FAFB',
  card:   '#FFFFFF',
  border: '#F3F4F6',
};

// ─── Ranges ───────────────────────────────────────────────────────────────────
const RANGES: { key: RangeType; label: string; icon: string }[] = [
  { key: 'day',   label: 'Día',    icon: '☀️' },
  { key: 'week',  label: 'Semana', icon: '📅' },
  { key: 'month', label: 'Mes',    icon: '🗓️' },
  { key: 'year',  label: 'Año',    icon: '📆' },
];

function shiftDate(d: Date, range: RangeType, dir: -1 | 1): Date {
  const n = new Date(d);
  if (range === 'day')   n.setDate(n.getDate()           + dir);
  if (range === 'week')  n.setDate(n.getDate()           + dir * 7);
  if (range === 'month') n.setMonth(n.getMonth()         + dir);
  if (range === 'year')  n.setFullYear(n.getFullYear()   + dir);
  return n;
}

// ─── Componentes UI ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, color, height = 8 }: {
  value: number; max: number; color: string; height?: number;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={{ height, backgroundColor: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: 99 }} />
    </View>
  );
}

function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
  if (curr === 0 && prev === 0) return null;
  const diff = curr - prev;
  if (diff === 0) return (
    <View style={{ backgroundColor: '#F3F4F6', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.muted }}>= igual</Text>
    </View>
  );
  const up  = diff > 0;
  const pct = prev > 0 ? Math.abs(Math.round((diff / prev) * 100)) : null;
  return (
    <View style={{
      backgroundColor: up ? '#D1FAE5' : '#FEE2E2',
      borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2,
    }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: up ? '#065F46' : '#991B1B' }}>
        {up ? '↑' : '↓'} {pct != null ? `${pct}%` : `${Math.abs(diff)}`}
      </Text>
    </View>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 20, padding: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, ...style,
    }}>
      {children}
    </View>
  );
}

function SectionHeader({ emoji, title, count, countUnit, curr, prev }: {
  emoji: string; title: string; count?: number; countUnit?: string;
  curr?: number; prev?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ flex: 1, fontWeight: '900', fontSize: 15, color: C.text }}>
        {title}
        {count != null ? (
          <Text style={{ fontWeight: '600', color: C.muted }}> — {count} {countUnit}</Text>
        ) : null}
      </Text>
      {curr != null && prev != null && <DeltaBadge curr={curr} prev={prev} />}
    </View>
  );
}

function TrioStats({ items }: {
  items: { label: string; value: string; sub?: string; color?: string }[];
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
      {items.map((it, i) => (
        <View key={i} style={{
          flex: 1, backgroundColor: C.bg, borderRadius: 14,
          padding: 10, alignItems: 'center',
        }}>
          <Text style={{ fontWeight: '900', fontSize: 14, color: it.color ?? C.text }}>{it.value}</Text>
          {it.sub && <Text style={{ fontSize: 10, color: it.color ?? C.feed, fontWeight: '700', marginTop: 1 }}>{it.sub}</Text>}
          <Text style={{ fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 3, textAlign: 'center' }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

function CompareTable({ rows, prevLabel }: {
  rows: { label: string; curr: number; prev: number; fmt?: (n: number) => string }[];
  prevLabel: string;
}) {
  const fmt = (fn: ((n: number) => string) | undefined, v: number) => fn ? fn(v) : String(v);
  return (
    <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12, marginTop: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
        📊 vs {prevLabel}
      </Text>
      {rows.map((row, i) => {
        const diff = row.curr - row.prev;
        const up   = diff > 0;
        const pctV = row.prev > 0 ? Math.abs(Math.round((diff / row.prev) * 100)) : null;
        return (
          <View key={i} style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: 5,
            borderBottomWidth: i < rows.length - 1 ? 1 : 0,
            borderBottomColor: C.border,
          }}>
            <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600', flex: 1 }}>{row.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{fmt(row.fmt, row.prev)}</Text>
              <Text style={{ fontSize: 11, color: '#D1D5DB' }}>→</Text>
              <Text style={{ fontSize: 12, fontWeight: '900', color: C.text }}>{fmt(row.fmt, row.curr)}</Text>
              {diff !== 0 && (
                <Text style={{ fontSize: 10, fontWeight: '800', color: up ? '#059669' : '#DC2626' }}>
                  {up ? '▲' : '▼'}{pctV != null ? `${pctV}%` : Math.abs(diff)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── ChartCard — wrapper de gráfica con título y leyenda de color ─────────────

function ChartCard({
  title, subtitle, children, accent,
}: {
  title: string; subtitle?: string; children: React.ReactNode; accent: string;
}) {
  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 18,
      paddingTop: 14, paddingHorizontal: 12, paddingBottom: 10,
      borderTopWidth: 3, borderTopColor: accent,
      shadowColor: accent, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: 4 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent, marginRight: 8 }} />
        <Text style={{ fontWeight: '900', fontSize: 13, color: C.text, flex: 1 }}>{title}</Text>
        {subtitle && (
          <Text style={{ fontSize: 10, color: C.muted, fontWeight: '600' }}>{subtitle}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── Selector de métrica de crecimiento ──────────────────────────────────────

type GrowthMetric = 'weightKg' | 'heightCm' | 'headCircCm';
const GROWTH_METRICS: { key: GrowthMetric; label: string; color: string; unit: string }[] = [
  { key: 'weightKg',   label: '⚖️ Peso',   color: C.weight, unit: 'kg'   },
  { key: 'heightCm',   label: '📏 Talla',  color: C.height, unit: 'cm'   },
  { key: 'headCircCm', label: '🔵 Cráneo', color: C.head,   unit: 'cm'   },
];

// ─── PANTALLA PRINCIPAL ───────────────────────────────────────────────────────

export default function StatsScreen() {
  const [range, setRange]           = useState<RangeType>('day');
  const [refDate, setRefDate]       = useState(() => new Date());
  const [sharing, setSharing]       = useState(false);
  const [growthMetric, setGrowthMetric] = useState<GrowthMetric>('weightKg');

  const { data: baby }                  = useActiveBaby();
  const { data: result, isLoading }     = useStats(baby?.id, range, refDate);
  const { data: chartData, isLoading: chartLoading } = useChartData(baby?.id, range, refDate);

  const isCurrentPeriod = useMemo(() => {
    const todayBounds = getRangeBounds(range, new Date());
    const refBounds   = getRangeBounds(range, refDate);
    return refBounds.start.getTime() === todayBounds.start.getTime();
  }, [range, refDate]);

  // ─── Compartir ────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!result || !baby) return;
    setSharing(true);
    try {
      await shareReport({
        babyName:  baby.nickname || baby.name,
        range, refDate,
        stats:     result.current,
        prevStats: result.previous,
        prevLabel: result.prevLabel,
      });
    } catch (e: any) {
      Alert.alert('No se pudo compartir', e?.message ?? 'Intenta de nuevo');
    } finally {
      setSharing(false);
    }
  };

  const curr      = result?.current;
  const prev      = result?.previous;
  const hasImages = (curr?.diaperImageUris.length ?? 0) > 0;

  // ─── Preparar datos para charts ───────────────────────────────────────────

  // Etiquetas del eje X y series por tipo
  const feedBars = chartData?.buckets.map(b => ({ label: b.label, value: b.feeding })) ?? [];
  const diaperBars = chartData?.buckets.map(b => ({ label: b.label, value: b.diaper })) ?? [];
  const sleepArea = chartData?.buckets.map(b => b.sleep) ?? [];
  const feedArea  = chartData?.buckets.map(b => b.feeding) ?? [];
  const diaperArea = chartData?.buckets.map(b => b.diaper) ?? [];
  const xLabels   = chartData?.buckets.map(b => b.label) ?? [];

  // Para la gráfica de crecimiento seleccionada
  const growthMeta = GROWTH_METRICS.find(m => m.key === growthMetric)!;
  const growthPts  = growthMetric === 'weightKg'
    ? (chartData?.weightHistory ?? [])
    : growthMetric === 'heightCm'
      ? (chartData?.heightHistory ?? [])
      : (chartData?.headHistory ?? []);

  // Título del chart según el rango
  const chartTitle: Record<RangeType, string> = {
    day:   'Por hora (hoy)',
    week:  'Por día (esta semana)',
    month: 'Por día (este mes)',
    year:  'Por mes (este año)',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF8AB3' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />

      {/* ── Header ── */}
      <View style={{
        backgroundColor: '#FF8AB3',
        paddingHorizontal: 16, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#FFF', fontSize: 26, lineHeight: 28 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>📊 Estadísticas</Text>
          {baby && (
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>
              {baby.nickname || baby.name}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleShare}
          disabled={sharing || !result}
          style={{
            backgroundColor: '#25D366', borderRadius: 20,
            paddingHorizontal: 14, paddingVertical: 7,
            flexDirection: 'row', alignItems: 'center', gap: 5,
            opacity: sharing || !result ? 0.5 : 1,
          }}
        >
          {sharing
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>
                📤 {hasImages ? `+ ${curr!.diaperImageUris.length}📷` : 'Compartir'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Tabs de rango ── */}
      <View style={{
        backgroundColor: '#FF8AB3', paddingHorizontal: 16, paddingBottom: 14,
        flexDirection: 'row', gap: 6,
      }}>
        {RANGES.map(r => {
          const active = range === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => { setRange(r.key); setRefDate(new Date()); }}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 14, alignItems: 'center',
                backgroundColor: active ? '#FFF' : 'rgba(255,255,255,0.22)',
              }}
            >
              <Text style={{ fontSize: 14 }}>{r.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: '900', color: active ? '#FF5C9A' : '#FFF', marginTop: 1 }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Navegador de fecha ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingVertical: 12,
          backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <TouchableOpacity
            onPress={() => setRefDate(shiftDate(refDate, range, -1))}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 20, color: C.feed, lineHeight: 22 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontWeight: '900', fontSize: 16, color: C.text }}>{result?.rangeLabel ?? '…'}</Text>
            {!isCurrentPeriod && (
              <TouchableOpacity onPress={() => setRefDate(new Date())} style={{ marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: C.feed, fontWeight: '700' }}>Ir al actual →</Text>
              </TouchableOpacity>
            )}
            {isCurrentPeriod && (
              <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }}>Período actual</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => !isCurrentPeriod && setRefDate(shiftDate(refDate, range, 1))}
            disabled={isCurrentPeriod}
            style={{
              width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F5',
              alignItems: 'center', justifyContent: 'center',
              opacity: isCurrentPeriod ? 0.25 : 1,
            }}
          >
            <Text style={{ fontSize: 20, color: C.feed, lineHeight: 22 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Loading ── */}
        {isLoading || !curr || !prev ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.feed} />
            <Text style={{ color: C.muted, marginTop: 12, fontWeight: '600' }}>Calculando…</Text>
          </View>
        ) : (
          <View style={{ padding: 14, gap: 12 }}>

            {/* ── Tarjetas resumen ── */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { emoji: '🍼', label: 'Tomas',   value: String(curr.feedingCount),
                  sub: curr.feedingCount > 0 ? formatDuration(curr.feedingAvgSec) + ' prom.' : '—',
                  color: C.feed, curr: curr.feedingCount, prev: prev.feedingCount },
                { emoji: '😴', label: 'Siestas', value: String(curr.sleepCount),
                  sub: curr.sleepCount > 0 ? formatDuration(curr.sleepAvgSec) + ' prom.' : '—',
                  color: C.sleep, curr: curr.sleepCount, prev: prev.sleepCount },
                { emoji: '🍑', label: 'Pañales', value: String(curr.diaperCount),
                  sub: curr.diaperWithPoop > 0 ? `${curr.diaperWithPoop} con 💩` : '—',
                  color: C.diaper, curr: curr.diaperCount, prev: prev.diaperCount },
              ].map((card, i) => (
                <View key={i} style={{
                  flex: 1, backgroundColor: C.card, borderRadius: 18,
                  padding: 12, borderTopWidth: 3, borderTopColor: card.color,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>{card.emoji}</Text>
                  <Text style={{ fontWeight: '900', fontSize: 22, color: card.color }}>{card.value}</Text>
                  <Text style={{ fontSize: 10, color: card.color, fontWeight: '700', marginTop: 1 }}>{card.sub}</Text>
                  <Text style={{ fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 3 }}>{card.label}</Text>
                  <View style={{ marginTop: 6 }}><DeltaBadge curr={card.curr} prev={card.prev} /></View>
                </View>
              ))}
            </View>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* GRÁFICAS                                                       */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {chartLoading ? (
              <View style={{
                backgroundColor: C.card, borderRadius: 18,
                height: 80, alignItems: 'center', justifyContent: 'center',
              }}>
                <ActivityIndicator color={C.feed} />
              </View>
            ) : chartData ? (
              <View style={{ gap: 12 }}>

                {/* ── Chart 1: Tomas (BarChart) ── */}
                <ChartCard
                  title="Tomas"
                  subtitle={chartTitle[range]}
                  accent={C.feed}
                >
                  <BarChart
                    data={feedBars}
                    color={C.feed}
                    height={range === 'day' ? 130 : range === 'month' ? 120 : 140}
                    showAvg
                    unit="tomas"
                    noData="Sin tomas en este período"
                  />
                </ChartCard>

                {/* ── Chart 2: Sueño + Pañales (AreaChart multi-serie) ── */}
                <ChartCard
                  title="Sueño y Pañales"
                  subtitle={chartTitle[range]}
                  accent={C.sleep}
                >
                  <AreaChart
                    series={[
                      { data: sleepArea, color: C.sleep,  label: range === 'day' ? 'Sueño (min/h)' : 'Sueño (min/día)' },
                      { data: diaperArea, color: C.diaper, label: 'Pañales' },
                    ]}
                    labels={xLabels}
                    height={range === 'day' ? 140 : 150}
                    showDots={range === 'week' || range === 'year'}
                    noData="Sin datos en este período"
                  />
                </ChartCard>

                {/* ── Chart 3: Actividad combinada (solo semana/mes/año) ── */}
                {range !== 'day' && (
                  <ChartCard
                    title="Tomas vs Pañales"
                    subtitle="Comparativa del período"
                    accent={C.feed}
                  >
                    <AreaChart
                      series={[
                        { data: feedArea,   color: C.feed,   label: 'Tomas' },
                        { data: diaperArea, color: C.diaper, label: 'Pañales' },
                      ]}
                      labels={xLabels}
                      height={140}
                      showDots={range === 'week'}
                      noData="Sin datos en este período"
                    />
                  </ChartCard>
                )}

                {/* ── Chart 4: Crecimiento (si hay datos) ── */}
                {chartData.hasGrowth && (
                  <ChartCard
                    title="Crecimiento"
                    subtitle="Histórico completo"
                    accent={growthMeta.color}
                  >
                    {/* Selector de métrica */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      {GROWTH_METRICS.map(m => {
                        // Solo mostrar si hay datos
                        const hasPts = m.key === 'weightKg'
                          ? chartData.weightHistory.length > 0
                          : m.key === 'heightCm'
                            ? chartData.heightHistory.length > 0
                            : chartData.headHistory.length > 0;
                        if (!hasPts) return null;
                        const active = growthMetric === m.key;
                        return (
                          <TouchableOpacity
                            key={m.key}
                            onPress={() => setGrowthMetric(m.key)}
                            style={{
                              paddingHorizontal: 12, paddingVertical: 6,
                              borderRadius: 99, borderWidth: 1.5,
                              borderColor: active ? m.color : C.border,
                              backgroundColor: active ? m.color + '18' : C.bg,
                            }}
                          >
                            <Text style={{
                              fontSize: 12, fontWeight: '800',
                              color: active ? m.color : C.muted,
                            }}>
                              {m.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <GrowthLineChart
                      points={growthPts}
                      field={growthMetric}
                      color={growthMeta.color}
                      unit={growthMeta.unit}
                      height={180}
                      noData={`Sin mediciones de ${growthMeta.label}`}
                    />
                  </ChartCard>
                )}

              </View>
            ) : null}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* STATS DETALLADAS                                               */}
            {/* ══════════════════════════════════════════════════════════════ */}

            {/* ── Sección: Tomas ── */}
            <SectionCard>
              <SectionHeader
                emoji="🍼" title="Tomas"
                count={curr.feedingCount} countUnit="sesiones"
                curr={curr.feedingCount} prev={prev.feedingCount}
              />
              {curr.feedingCount === 0 ? (
                <Text style={emptyMsg}>Sin tomas en este período</Text>
              ) : (
                <>
                  <TrioStats items={[
                    { label: 'sesiones',     value: String(curr.feedingCount),           color: C.feed },
                    { label: 'tiempo total', value: formatDuration(curr.feedingTotalSec), color: C.feed },
                    { label: 'promedio',     value: formatDuration(curr.feedingAvgSec),   color: C.feed },
                  ]} />
                  <Text style={subLabel}>Distribución por tipo</Text>
                  {(['breast_left', 'breast_right', 'bottle'] as const).map(type => {
                    const count = curr.feedingByType[type] ?? 0;
                    if (count === 0) return null;
                    const pctV = Math.round((count / curr.feedingCount) * 100);
                    const lbl: Record<string, string> = {
                      breast_left: '🤱 Pecho Izq.',
                      breast_right: '🤱 Pecho Der.',
                      bottle: '🍼 Biberón',
                    };
                    return (
                      <View key={type} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{lbl[type]}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: C.feed }}>
                            {count} <Text style={{ fontWeight: '600', color: C.muted }}>({pctV}%)</Text>
                          </Text>
                        </View>
                        <ProgressBar value={count} max={curr.feedingCount} color={C.feed} height={7} />
                        {type === 'bottle' && Object.keys(curr.feedingBySubtype).length > 0 && (
                          <View style={{ marginTop: 6, marginLeft: 12, gap: 4 }}>
                            {Object.entries(curr.feedingBySubtype).map(([sub, cnt]) => {
                              const subLbl: Record<string, string> = {
                                breast_milk: '🤱 L. materna', formula: '🥛 Fórmula',
                                mixed: '🔀 Mixta', other: '🍶 Otro',
                              };
                              return (
                                <View key={sub} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 12, color: C.muted }}>{subLbl[sub] ?? sub}</Text>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#A855F7' }}>
                                    {cnt} ({Math.round((cnt / (curr.feedingByType['bottle'] ?? 1)) * 100)}%)
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                  <CompareTable
                    prevLabel={result.prevLabel}
                    rows={[
                      { label: 'Sesiones',     curr: curr.feedingCount,    prev: prev.feedingCount },
                      { label: 'Tiempo total', curr: curr.feedingTotalSec, prev: prev.feedingTotalSec, fmt: formatDuration },
                      { label: 'Promedio',     curr: curr.feedingAvgSec,   prev: prev.feedingAvgSec,  fmt: formatDuration },
                    ]}
                  />
                </>
              )}
            </SectionCard>

            {/* ── Sección: Sueño ── */}
            <SectionCard>
              <SectionHeader
                emoji="😴" title="Sueño"
                count={curr.sleepCount} countUnit="siestas"
                curr={curr.sleepTotalSec} prev={prev.sleepTotalSec}
              />
              {curr.sleepCount === 0 ? (
                <Text style={emptyMsg}>Sin siestas registradas</Text>
              ) : (
                <>
                  <TrioStats items={[
                    { label: 'siestas',       value: String(curr.sleepCount),            color: C.sleep },
                    { label: 'total dormido', value: formatDuration(curr.sleepTotalSec),  color: C.sleep },
                    { label: 'por siesta',    value: formatDuration(curr.sleepAvgSec),    color: C.sleep },
                  ]} />
                  {range === 'day' && (
                    <>
                      <Text style={[subLabel, { marginBottom: 6 }]}>
                        % del día dormido — {Math.round((curr.sleepTotalSec / 86400) * 100)}%
                      </Text>
                      <ProgressBar value={curr.sleepTotalSec} max={86400} color={C.sleep} height={10} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontSize: 10, color: C.muted }}>0h</Text>
                        <Text style={{ fontSize: 10, color: C.muted }}>24h</Text>
                      </View>
                    </>
                  )}
                  <CompareTable
                    prevLabel={result.prevLabel}
                    rows={[
                      { label: 'Siestas',    curr: curr.sleepCount,    prev: prev.sleepCount },
                      { label: 'Total',      curr: curr.sleepTotalSec, prev: prev.sleepTotalSec, fmt: formatDuration },
                      { label: 'Por siesta', curr: curr.sleepAvgSec,   prev: prev.sleepAvgSec,  fmt: formatDuration },
                    ]}
                  />
                </>
              )}
            </SectionCard>

            {/* ── Sección: Pañales ── */}
            <SectionCard>
              <SectionHeader
                emoji="🍑" title="Pañales"
                count={curr.diaperCount} countUnit="cambios"
                curr={curr.diaperCount} prev={prev.diaperCount}
              />
              {curr.diaperCount === 0 ? (
                <Text style={emptyMsg}>Sin pañales registrados</Text>
              ) : (
                <>
                  <TrioStats items={[
                    { label: 'cambios',   value: String(curr.diaperCount),              color: C.diaper },
                    { label: 'con 💩',    value: String(curr.diaperWithPoop),            color: C.diaper },
                    { label: '📷 fotos', value: String(curr.diaperImageUris.length),    color: C.diaper },
                  ]} />
                  <Text style={subLabel}>Intensidad promedio</Text>
                  {[
                    { label: '💧 Pipí', value: curr.diaperPeeAvg,  color: '#60A5FA' },
                    { label: '💩 Popó', value: curr.diaperPoopAvg, color: '#D97706' },
                  ].map(row => (
                    <View key={row.label} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{row.label}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: row.color }}>{row.value} / 5</Text>
                      </View>
                      <ProgressBar value={row.value} max={5} color={row.color} height={8} />
                    </View>
                  ))}
                  {hasImages && (
                    <View style={{
                      backgroundColor: '#FFFBEB', borderRadius: 12, padding: 10, marginTop: 6,
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                    }}>
                      <Text style={{ fontSize: 18 }}>📷</Text>
                      <Text style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: '700' }}>
                        {curr.diaperImageUris.length} foto(s) se incluirán al compartir.
                      </Text>
                    </View>
                  )}
                  <CompareTable
                    prevLabel={result.prevLabel}
                    rows={[
                      { label: 'Cambios',    curr: curr.diaperCount,       prev: prev.diaperCount },
                      { label: 'Con popó',   curr: curr.diaperWithPoop,    prev: prev.diaperWithPoop },
                      { label: 'Pipí prom.', curr: curr.diaperPeeAvg * 10, prev: prev.diaperPeeAvg * 10,
                        fmt: v => (v / 10).toFixed(1) },
                      { label: 'Popó prom.', curr: curr.diaperPoopAvg * 10, prev: prev.diaperPoopAvg * 10,
                        fmt: v => (v / 10).toFixed(1) },
                    ]}
                  />
                </>
              )}
            </SectionCard>

            {/* ── Otros eventos ── */}
            {Object.entries(curr.eventsByType).some(([k]) => k !== 'diaper') && (
              <SectionCard>
                <SectionHeader emoji="📋" title="Otros eventos" />
                {Object.entries(curr.eventsByType)
                  .filter(([k]) => k !== 'diaper')
                  .sort((a, b) => b[1] - a[1])
                  .map(([typeId, count]) => {
                    const lbls: Record<string, string> = {
                      burp: '💨 Eructos', regurgitation: '🤧 Regurgitaciones',
                      vomit: '🤮 Vómitos', medication: '💊 Medicamentos',
                      weight: '⚖️ Peso', height: '📏 Estatura',
                      temperature: '🌡️ Temperatura', note: '📝 Notas',
                    };
                    const prevCount = prev.eventsByType[typeId] ?? 0;
                    return (
                      <View key={typeId} style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border,
                      }}>
                        <Text style={{ fontSize: 14, color: C.text, fontWeight: '700' }}>
                          {lbls[typeId] ?? typeId}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: C.other }}>{count}</Text>
                          <DeltaBadge curr={count} prev={prevCount} />
                        </View>
                      </View>
                    );
                  })}
              </SectionCard>
            )}

            {/* ── Entre tomas ── */}
            {curr.interFeedingEvents.length > 0 && (
              <SectionCard>
                <SectionHeader emoji="🔄" title="Entre tomas" />
                <Text style={[subLabel, { marginBottom: 10 }]}>Eventos que ocurren tras una toma</Text>
                {curr.interFeedingEvents.map(ev => {
                  const lbls: Record<string, string> = {
                    burp: '💨 Eructos', regurgitation: '🤧 Regurgitaciones',
                    vomit: '🤢 Vómitos', medication: '💊 Medicamentos',
                    temperature: '🌡️ Temperatura', note: '📝 Notas',
                  };
                  const prevEv = prev.interFeedingEvents.find(e => e.typeId === ev.typeId);
                  return (
                    <View key={ev.typeId} style={{
                      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>
                          {lbls[ev.typeId] ?? ev.typeId}
                        </Text>
                        {ev.avgMinAfterFeeding != null && (
                          <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            ⤵️ ~{ev.avgMinAfterFeeding} min después de una toma
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: C.other }}>{ev.count}</Text>
                        <DeltaBadge curr={ev.count} prev={prevEv?.count ?? 0} />
                      </View>
                    </View>
                  );
                })}
              </SectionCard>
            )}

            {/* ── Crecimiento (tabla) ── */}
            {(curr.latestGrowth || curr.growthHistory.length > 0) && (
              <SectionCard>
                <SectionHeader
                  emoji="📈" title="Crecimiento"
                  count={curr.growthHistory.length || undefined}
                  countUnit={curr.growthHistory.length > 0 ? 'mediciones' : undefined}
                />
                {curr.latestGrowth && (
                  <>
                    <Text style={subLabel}>Registro más reciente</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                      {[
                        curr.latestGrowth.weightGrams != null && {
                          emoji: '⚖️', val: (curr.latestGrowth.weightGrams / 1000).toFixed(3),
                          unit: 'kg', bg: '#F0FDF4', border: '#10B981', text: '#065F46',
                        },
                        curr.latestGrowth.heightMm != null && {
                          emoji: '📏', val: (curr.latestGrowth.heightMm / 10).toFixed(1),
                          unit: 'cm', bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8',
                        },
                        curr.latestGrowth.headCircMm != null && {
                          emoji: '🔵', val: (curr.latestGrowth.headCircMm / 10).toFixed(1),
                          unit: 'cm', bg: '#F5F3FF', border: '#8B5CF6', text: '#5B21B6',
                        },
                      ].filter(Boolean).map((card: any, i) => (
                        <View key={i} style={{
                          flex: 1, backgroundColor: card.bg, borderRadius: 14,
                          padding: 12, alignItems: 'center',
                          borderLeftWidth: 3, borderLeftColor: card.border,
                        }}>
                          <Text style={{ fontSize: 20 }}>{card.emoji}</Text>
                          <Text style={{ fontSize: 17, fontWeight: '900', color: card.text, marginTop: 4 }}>
                            {card.val}
                          </Text>
                          <Text style={{ fontSize: 10, color: card.border, fontWeight: '700' }}>{card.unit}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {curr.growthHistory.length > 1 && (
                  <>
                    <Text style={subLabel}>Historial en el período</Text>
                    {curr.growthHistory.map((pt, idx) => (
                      <View key={idx} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingVertical: 7,
                        borderBottomWidth: idx < curr.growthHistory.length - 1 ? 1 : 0,
                        borderBottomColor: C.border,
                      }}>
                        <Text style={{ fontSize: 11, color: C.muted, width: 60, fontWeight: '600' }}>
                          {pt.timestamp.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </Text>
                        {pt.weightGrams != null && (
                          <Text style={{ flex: 1, fontSize: 13, color: '#065F46', fontWeight: '800' }}>
                            ⚖️ {(pt.weightGrams / 1000).toFixed(3)} kg
                          </Text>
                        )}
                        {pt.heightMm != null && (
                          <Text style={{ flex: 1, fontSize: 13, color: '#1D4ED8', fontWeight: '800' }}>
                            📏 {(pt.heightMm / 10).toFixed(1)} cm
                          </Text>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </SectionCard>
            )}

            {/* ── Botón compartir ── */}
            <TouchableOpacity
              onPress={handleShare}
              disabled={sharing}
              style={{
                backgroundColor: '#25D366', borderRadius: 20, padding: 18,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12,
                shadowColor: '#25D366', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
                opacity: sharing ? 0.6 : 1, marginTop: 4,
              }}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={{ fontSize: 26 }}>📤</Text>
                  <View>
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 17 }}>Compartir reporte</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>
                      {result.rangeLabel}
                      {hasImages ? `  ·  ${curr.diaperImageUris.length} foto(s)` : '  ·  solo texto'}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const subLabel: any = {
  fontSize: 11, fontWeight: '800', color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
};
const emptyMsg: any = {
  color: '#D1D5DB', fontWeight: '600', textAlign: 'center', paddingVertical: 8,
};
