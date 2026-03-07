/**
 * app/stats/index.tsx — Estadísticas completas de Cielo
 *
 * Filtros: Día / Semana / Mes / Año
 * Comparación vs período anterior
 * Botón compartir (texto + fotos de pañal vía share nativo)
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
import { shareReport } from '@/src/utils/shareReport';
import { formatDuration } from '@/src/db/client';

// ─── Colores por categoría ────────────────────────────────────────────────────
const C = {
  feed:   '#FF5C9A',
  sleep:  '#6366F1',
  diaper: '#F59E0B',
  other:  '#10B981',
  text:   '#1F2937',
  muted:  '#6B7280',
  bg:     '#F9FAFB',
  card:   '#FFFFFF',
  border: '#F3F4F6',
};

// ─── Selector de rango ────────────────────────────────────────────────────────
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

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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
  const up = diff > 0;
  const pctVal = prev > 0 ? Math.abs(Math.round((diff / prev) * 100)) : null;
  return (
    <View style={{
      backgroundColor: up ? '#D1FAE5' : '#FEE2E2',
      borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2,
    }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: up ? '#065F46' : '#991B1B' }}>
        {up ? '↑' : '↓'} {pctVal != null ? `${pctVal}%` : `${Math.abs(diff)}`}
      </Text>
    </View>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 20, padding: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
      ...style,
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
    <View style={{
      backgroundColor: C.bg, borderRadius: 14, padding: 12, marginTop: 10,
    }}>
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

// ─── PANTALLA ─────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const [range, setRange]     = useState<RangeType>('day');
  const [refDate, setRefDate] = useState(() => new Date());
  const [sharing, setSharing] = useState(false);

  const { data: baby }                       = useActiveBaby();
  const { data: result, isLoading }          = useStats(baby?.id, range, refDate);

  // ¿Estamos en el período actual?
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
        range,
        refDate,
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
          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>
            📊 Estadísticas
          </Text>
          {baby && (
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>
              {baby.nickname || baby.name}
            </Text>
          )}
        </View>

        {/* Botón compartir en header */}
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
            <Text style={{ fontWeight: '900', fontSize: 16, color: C.text }}>
              {result?.rangeLabel ?? '…'}
            </Text>
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
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center',
              opacity: isCurrentPeriod ? 0.25 : 1,
            }}
          >
            <Text style={{ fontSize: 20, color: C.feed, lineHeight: 22 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cargando ── */}
        {isLoading || !curr || !prev ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.feed} />
            <Text style={{ color: C.muted, marginTop: 12, fontWeight: '600' }}>Calculando…</Text>
          </View>
        ) : (
          <View style={{ padding: 16, gap: 12 }}>

            {/* ── Resumen: 3 tarjetas ── */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                {
                  emoji: '🍼', label: 'Tomas',
                  value: String(curr.feedingCount),
                  sub: curr.feedingCount > 0 ? formatDuration(curr.feedingAvgSec) + ' prom.' : '—',
                  color: C.feed,
                  curr: curr.feedingCount, prev: prev.feedingCount,
                },
                {
                  emoji: '😴', label: 'Siestas',
                  value: String(curr.sleepCount),
                  sub: curr.sleepCount > 0 ? formatDuration(curr.sleepAvgSec) + ' prom.' : '—',
                  color: C.sleep,
                  curr: curr.sleepCount, prev: prev.sleepCount,
                },
                {
                  emoji: '🍑', label: 'Pañales',
                  value: String(curr.diaperCount),
                  sub: curr.diaperWithPoop > 0 ? `${curr.diaperWithPoop} con 💩` : '—',
                  color: C.diaper,
                  curr: curr.diaperCount, prev: prev.diaperCount,
                },
              ].map((card, i) => (
                <View key={i} style={{
                  flex: 1, backgroundColor: C.card, borderRadius: 18,
                  padding: 12, borderTopWidth: 3, borderTopColor: card.color,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
                  alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>{card.emoji}</Text>
                  <Text style={{ fontWeight: '900', fontSize: 22, color: card.color }}>{card.value}</Text>
                  <Text style={{ fontSize: 10, color: card.color, fontWeight: '700', marginTop: 1 }}>{card.sub}</Text>
                  <Text style={{ fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 3 }}>{card.label}</Text>
                  <View style={{ marginTop: 6 }}>
                    <DeltaBadge curr={card.curr} prev={card.prev} />
                  </View>
                </View>
              ))}
            </View>

            {/* ── Sección: Tomas ── */}
            <SectionCard>
              <SectionHeader
                emoji="🍼" title="Tomas"
                count={curr.feedingCount} countUnit="sesiones"
                curr={curr.feedingCount} prev={prev.feedingCount}
              />

              {curr.feedingCount === 0 ? (
                <Text style={{ color: '#D1D5DB', fontWeight: '600', textAlign: 'center', paddingVertical: 8 }}>
                  Sin tomas en este período
                </Text>
              ) : (
                <>
                  <TrioStats items={[
                    { label: 'sesiones',     value: String(curr.feedingCount),          color: C.feed },
                    { label: 'tiempo total', value: formatDuration(curr.feedingTotalSec), color: C.feed },
                    { label: 'promedio',     value: formatDuration(curr.feedingAvgSec),   color: C.feed },
                  ]} />

                  {/* Barras por tipo */}
                  <Text style={subLabel}>Distribución por tipo</Text>
                  {(['breast_left', 'breast_right', 'bottle'] as const).map(type => {
                    const count = curr.feedingByType[type] ?? 0;
                    if (count === 0) return null;
                    const pctV = Math.round((count / curr.feedingCount) * 100);
                    const labels: Record<string, string> = {
                      breast_left:  '🤱 Pecho Izq.',
                      breast_right: '🤱 Pecho Der.',
                      bottle:       '🍼 Biberón',
                    };
                    return (
                      <View key={type} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{labels[type]}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: C.feed }}>
                            {count}{' '}
                            <Text style={{ fontWeight: '600', color: C.muted }}>({pctV}%)</Text>
                          </Text>
                        </View>
                        <ProgressBar value={count} max={curr.feedingCount} color={C.feed} height={7} />

                        {/* Subtipo biberón */}
                        {type === 'bottle' && Object.keys(curr.feedingBySubtype).length > 0 && (
                          <View style={{ marginTop: 6, marginLeft: 12, gap: 4 }}>
                            {Object.entries(curr.feedingBySubtype).map(([sub, cnt]) => {
                              const subLabels: Record<string, string> = {
                                breast_milk: '🤱 L. materna', formula: '🥛 Fórmula',
                                mixed: '🔀 Mixta', other: '🍶 Otro',
                              };
                              return (
                                <View key={sub} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 12, color: C.muted }}>{subLabels[sub] ?? sub}</Text>
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
                <Text style={{ color: '#D1D5DB', fontWeight: '600', textAlign: 'center', paddingVertical: 8 }}>
                  Sin siestas registradas
                </Text>
              ) : (
                <>
                  <TrioStats items={[
                    { label: 'siestas',       value: String(curr.sleepCount),           color: C.sleep },
                    { label: 'total dormido', value: formatDuration(curr.sleepTotalSec), color: C.sleep },
                    { label: 'por siesta',    value: formatDuration(curr.sleepAvgSec),   color: C.sleep },
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
                      { label: 'Siestas',      curr: curr.sleepCount,    prev: prev.sleepCount },
                      { label: 'Total',        curr: curr.sleepTotalSec, prev: prev.sleepTotalSec, fmt: formatDuration },
                      { label: 'Por siesta',   curr: curr.sleepAvgSec,   prev: prev.sleepAvgSec,  fmt: formatDuration },
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
                <Text style={{ color: '#D1D5DB', fontWeight: '600', textAlign: 'center', paddingVertical: 8 }}>
                  Sin pañales registrados
                </Text>
              ) : (
                <>
                  <TrioStats items={[
                    { label: 'cambios',    value: String(curr.diaperCount),    color: C.diaper },
                    { label: 'con 💩',     value: String(curr.diaperWithPoop), color: C.diaper },
                    { label: '📷 fotos',  value: String(curr.diaperImageUris.length), color: C.diaper },
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
                        {curr.diaperImageUris.length} foto(s) de pañal se incluirán al compartir.
                        Solo salen del dispositivo si tú lo eliges.
                      </Text>
                    </View>
                  )}

                  <CompareTable
                    prevLabel={result.prevLabel}
                    rows={[
                      { label: 'Cambios',    curr: curr.diaperCount,    prev: prev.diaperCount },
                      { label: 'Con popó',   curr: curr.diaperWithPoop, prev: prev.diaperWithPoop },
                      { label: 'Pipí prom.', curr: curr.diaperPeeAvg * 10, prev: prev.diaperPeeAvg * 10,
                        fmt: v => (v / 10).toFixed(1) },
                      { label: 'Popó prom.', curr: curr.diaperPoopAvg * 10, prev: prev.diaperPoopAvg * 10,
                        fmt: v => (v / 10).toFixed(1) },
                    ]}
                  />
                </>
              )}
            </SectionCard>

            {/* ── Sección: Otros eventos ── */}
            {Object.entries(curr.eventsByType).some(([k]) => k !== 'diaper') && (
              <SectionCard>
                <SectionHeader emoji="📋" title="Otros eventos" />
                {Object.entries(curr.eventsByType)
                  .filter(([k]) => k !== 'diaper')
                  .sort((a, b) => b[1] - a[1])
                  .map(([typeId, count]) => {
                    const labels: Record<string, string> = {
                      burp: '💨 Eructos', regurgitation: '🤧 Regurgitaciones',
                      vomit: '🤮 Vómitos', medication: '💊 Medicamentos',
                      weight: '⚖️ Peso', height: '📏 Estatura',
                      temperature: '🌡️ Temperatura', note: '📝 Notas',
                    };
                    const prevCount = prev.eventsByType[typeId] ?? 0;
                    return (
                      <View key={typeId} style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 9,
                        borderBottomWidth: 1, borderBottomColor: C.border,
                      }}>
                        <Text style={{ fontSize: 14, color: C.text, fontWeight: '700' }}>
                          {labels[typeId] ?? typeId}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: C.other }}>{count}</Text>
                          <DeltaBadge curr={count} prev={prevCount} />
                        </View>
                      </View>
                    );
                  })
                }
              </SectionCard>
            )}

            {/* ── Botón compartir grande ── */}
            <TouchableOpacity
              onPress={handleShare}
              disabled={sharing}
              style={{
                backgroundColor: '#25D366', borderRadius: 20, padding: 18,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12,
                shadowColor: '#25D366', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
                opacity: sharing ? 0.6 : 1,
                marginTop: 4,
              }}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={{ fontSize: 26 }}>📤</Text>
                  <View>
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 17 }}>
                      Compartir reporte
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>
                      {result.rangeLabel}
                      {hasImages ? `  ·  ${curr.diaperImageUris.length} foto(s) adjunta(s)` : '  ·  solo texto'}
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
