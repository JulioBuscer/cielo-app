/**
 * shareReport.ts — comparte registros del bebé de forma nativa.
 *
 * LIMITACIÓN TÉCNICA IMPORTANTE (documentada):
 * ─────────────────────────────────────────────
 * React Native / Expo no permite enviar texto + imagen juntos en un único
 * share sheet sin instalar react-native-share (dependencia nativa pesada).
 *   • Share.share()        → solo texto/URL (funciona directo en WhatsApp)
 *   • Sharing.shareAsync() → solo 1 archivo (imagen, PDF…), sin texto adjunto
 *
 * ESTRATEGIA ADOPTADA para registros con foto:
 *   1. Imagen primero  → el usuario elige el chat de WhatsApp / destino
 *   2. 600 ms de delay → el sheet anterior se cierra
 *   3. Texto completo  → el usuario elige el mismo chat
 *   Resultado: en el chat aparece [ foto ] seguida de [ mensaje detallado ]
 *   El orden imagen→texto es intencional: el contexto visual llega primero
 *   y el texto de análisis lo sigue inmediatamente.
 *
 * Para registros SIN foto: un solo Share.share() con el texto completo.
 */
import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { formatDuration } from '@/src/db/client';
import type { PeriodStats, RangeType } from '@/src/hooks/useStats';
import { formatRangeLabel } from '@/src/hooks/useStats';

// ─── Etiquetas ────────────────────────────────────────────────────────────────

export const FEEDING_TYPE_LABELS: Record<string, string> = {
  breast_left:  '🤱 Pecho Izquierdo',
  breast_right: '🤱 Pecho Derecho',
  bottle:       '🍼 Biberón',
};
export const BOTTLE_SUBTYPE_LABELS: Record<string, string> = {
  breast_milk: 'Leche materna',
  formula:     'Fórmula',
  mixed:       'Mixta',
  other:       'Otro',
};
export const EVENT_TYPE_LABELS: Record<string, string> = {
  diaper:        '🍑 Pañal',
  burp:          '💨 Eructo',
  regurgitation: '🤧 Regurgitación',
  vomit:         '🤮 Vómito',
  medication:    '💊 Medicamento',
  weight:        '⚖️ Peso',
  height:        '📏 Estatura',
  temperature:   '🌡️ Temperatura',
  note:          '📝 Nota',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(d: Date | string | number): string {
  const dt = d instanceof Date ? d : new Date(Number(d));
  return dt.toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

function stars(n: number, max = 5): string {
  const clamped = Math.min(Math.max(Math.round(n), 0), max);
  return '●'.repeat(clamped) + '○'.repeat(max - clamped);
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ─── Preparar imagen para compartir ──────────────────────────────────────────

async function prepareCachedImage(imageUri: string, label: string): Promise<string | null> {
  try {
    const cacheDir = (FileSystem.cacheDirectory ?? '') + 'cielo_share/';
    const info = await FileSystem.getInfoAsync(cacheDir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }
    const ext  = imageUri.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/, '') ?? 'jpg';
    const dest = cacheDir + `${label}_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: imageUri, to: dest });
    return dest;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE REGISTRO
// ─────────────────────────────────────────────────────────────────────────────

export interface DiaperShareData {
  type:               'diaper';
  babyName:           string;
  profileName?:       string;
  timestamp:          Date | number;
  peeIntensity:       number;
  poopIntensity:      number;
  // IDs de observaciones + sus labels resueltos desde el catálogo
  observationIds:     string[];
  observationLabels:  { id: string; emoji: string; label: string; isAlert: boolean }[];
  imageUri?:          string | null;
  notes?:             string | null;
  // Contexto: ¿durante qué sesión ocurrió?
  duringFeedingType?: string | null;    // 'breast_left' | 'breast_right' | 'bottle'
  duringFeedingMin?:  number | null;    // minutos transcurridos de la toma al guardar
  duringSleep?:       boolean;
}

export interface FeedingShareData {
  type:          'feeding';
  babyName:      string;
  profileName?:  string;
  feedingType:   string;
  bottleSubtype?: string | null;
  startedAt:     Date | number;
  endedAt?:      Date | number | null;
  durationSec?:  number | null;
  pauseCount?:   number;
  notes?:        string | null;
}

export interface SleepShareData {
  type:         'sleep';
  babyName:     string;
  profileName?: string;
  startedAt:    Date | number;
  endedAt?:     Date | number | null;
  durationSec?: number | null;
  pauseCount?:  number;
  notes?:       string | null;
}

export interface EventShareData {
  type:          'event';
  babyName:      string;
  profileName?:  string;
  eventTypeId:   string;
  eventLabel?:   string;
  timestamp:     Date | number;
  metadata?:     any;
  notes?:        string | null;
}

export interface GrowthShareData {
  type:          'growth';
  babyName:      string;
  profileName?:  string;
  timestamp:     Date | number;
  weightGrams?:  number | null;
  heightMm?:     number | null;
  headCircMm?:   number | null;
  notes?:        string | null;
}

export type AnyShareData =
  | DiaperShareData
  | FeedingShareData
  | SleepShareData
  | EventShareData
  | GrowthShareData;

// ─────────────────────────────────────────────────────────────────────────────
// buildRecordMessage — texto COMPLETO por registro
// ─────────────────────────────────────────────────────────────────────────────

export function buildRecordMessage(record: AnyShareData): string {
  const SEP = '─────────────────────';
  const L: string[] = [];

  // Cabecera
  L.push(`🌙 *Cielo App* — ${record.babyName}`);
  if (record.profileName) L.push(`👤 Registrado por: ${record.profileName}`);
  L.push('');

  switch (record.type) {

    // ── PAÑAL ──────────────────────────────────────────────────────────────
    case 'diaper': {
      const pee  = record.peeIntensity;
      const poop = record.poopIntensity;
      const hasPoop = poop > 0;

      L.push(`🍑 *CAMBIO DE PAÑAL*`);
      L.push(`🕐 ${fmtDateTime(record.timestamp)}`);
      L.push('');

      // Intensidades
      L.push(`💧 Pipí:   ${stars(pee)}  ${pee}/5`);
      L.push(`💩 Popó:   ${stars(poop)}  ${poop}/5`);
      L.push('');

      // Observaciones — separadas en alertas y normales
      const alerts  = record.observationLabels.filter(o => o.isAlert);
      const normals = record.observationLabels.filter(o => !o.isAlert);
      if (alerts.length > 0) {
        L.push(`🚨 *Alertas:* ${alerts.map(o => `${o.emoji} ${o.label}`).join(' · ')}`);
      }
      if (normals.length > 0) {
        L.push(`🔍 Obs:    ${normals.map(o => `${o.emoji} ${o.label}`).join(' · ')}`);
      }
      if (record.observationLabels.length === 0) {
        L.push(`✅ Sin observaciones especiales`);
      }
      L.push('');

      // Contexto de la toma/sueño
      if (record.duringFeedingType) {
        const fLabel = FEEDING_TYPE_LABELS[record.duringFeedingType] ?? record.duringFeedingType;
        const minStr = record.duringFeedingMin != null
          ? ` (${record.duringFeedingMin} min después de iniciarla)`
          : '';
        L.push(`🍼 Durante: ${fLabel}${minStr}`);
      }
      if (record.duringSleep) {
        L.push(`😴 Durante una sesión de sueño`);
      }

      // Foto
      if (record.imageUri) {
        L.push(`📷 Foto adjunta (ver imagen anterior)`);
      }

      // Notas
      if (record.notes?.trim()) {
        L.push('');
        L.push(`📝 ${record.notes.trim()}`);
      }
      break;
    }

    // ── TOMA ───────────────────────────────────────────────────────────────
    case 'feeding': {
      const typeLbl = FEEDING_TYPE_LABELS[record.feedingType] ?? record.feedingType;
      const sub     = record.bottleSubtype
        ? BOTTLE_SUBTYPE_LABELS[record.bottleSubtype] ?? record.bottleSubtype
        : null;

      L.push(`🍼 *TOMA — ${typeLbl}*`);
      if (sub) L.push(`   Contenido: ${sub}`);
      L.push('');
      L.push(`▶️  Inicio:   ${fmtDateTime(record.startedAt)}`);
      if (record.endedAt) {
        L.push(`⏹️  Fin:      ${fmtDateTime(record.endedAt)}`);
      }
      if (record.durationSec) {
        L.push('');
        L.push(`⏱ *Duración efectiva: ${formatDuration(record.durationSec)}*`);
      }
      if (record.pauseCount && record.pauseCount > 0) {
        L.push(`⏸ Pausas: ${record.pauseCount}`);
      }
      if (record.notes?.trim()) {
        L.push('');
        L.push(`📝 ${record.notes.trim()}`);
      }
      break;
    }

    // ── SUEÑO ──────────────────────────────────────────────────────────────
    case 'sleep': {
      L.push(`😴 *SUEÑO*`);
      L.push('');
      L.push(`▶️  Inicio:   ${fmtDateTime(record.startedAt)}`);
      if (record.endedAt) {
        L.push(`🌅  Fin:      ${fmtDateTime(record.endedAt)}`);
      }
      if (record.durationSec) {
        L.push('');
        L.push(`💤 *Duración: ${formatDuration(record.durationSec)}*`);
      }
      if (record.pauseCount && record.pauseCount > 0) {
        L.push(`⏸ Pausas: ${record.pauseCount}`);
      }
      if (record.notes?.trim()) {
        L.push('');
        L.push(`📝 ${record.notes.trim()}`);
      }
      break;
    }

    // ── EVENTO GENÉRICO ────────────────────────────────────────────────────
    case 'event': {
      const lbl = record.eventLabel
        ?? EVENT_TYPE_LABELS[record.eventTypeId]
        ?? record.eventTypeId;

      L.push(`*${lbl}*`);
      L.push(`🕐 ${fmtDateTime(record.timestamp)}`);
      L.push('');

      // Metadata por tipo
      if (record.metadata) {
        const m = typeof record.metadata === 'string'
          ? (() => { try { return JSON.parse(record.metadata); } catch { return {}; } })()
          : record.metadata;

        if (record.eventTypeId === 'temperature' && m.celsius != null) {
          L.push(`🌡️ Temperatura: *${m.celsius}°C*`);
          if (m.celsius >= 38)      L.push(`   ⚠️ Consulta al pediatra si supera 38.5°C`);
        }
        if (record.eventTypeId === 'medication') {
          if (m.medicineName) L.push(`💊 Medicamento: ${m.medicineName}`);
          if (m.dose)         L.push(`   Dosis: ${m.dose}`);
        }
        if (record.eventTypeId === 'weight' && m.weightGrams) {
          L.push(`⚖️ Peso: ${(m.weightGrams / 1000).toFixed(3)} kg`);
        }
        if (record.eventTypeId === 'height' && m.heightMm) {
          L.push(`📏 Talla: ${(m.heightMm / 10).toFixed(1)} cm`);
        }
        if (record.eventTypeId === 'burp' || record.eventTypeId === 'regurgitation') {
          if (m.quantity != null) L.push(`   Cantidad: ${m.quantity}`);
        }
      }

      if (record.notes?.trim()) {
        L.push('');
        L.push(`📝 ${record.notes.trim()}`);
      }
      break;
    }

    // ── CRECIMIENTO ────────────────────────────────────────────────────────
    case 'growth': {
      L.push(`📈 *MEDICIÓN DE CRECIMIENTO*`);
      L.push(`🕐 ${fmtDateTime(record.timestamp)}`);
      L.push('');
      if (record.weightGrams != null) L.push(`⚖️ Peso:   *${(record.weightGrams / 1000).toFixed(3)} kg*`);
      if (record.heightMm    != null) L.push(`📏 Talla:  *${(record.heightMm / 10).toFixed(1)} cm*`);
      if (record.headCircMm  != null) L.push(`🔵 Cráneo: *${(record.headCircMm / 10).toFixed(1)} cm*`);
      if (record.notes?.trim()) {
        L.push('');
        L.push(`📝 ${record.notes.trim()}`);
      }
      break;
    }
  }

  L.push('');
  L.push(SEP);
  L.push('_Cielo App 🌙_');
  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// shareSingleRecord — compartir 1 registro (con o sin foto)
// ─────────────────────────────────────────────────────────────────────────────

export async function shareSingleRecord(record: AnyShareData): Promise<void> {
  const message  = buildRecordMessage(record);
  const imageUri = record.type === 'diaper' ? (record.imageUri ?? null) : null;
  const canShare = await Sharing.isAvailableAsync();

  if (imageUri && canShare) {
    // ── Con foto: imagen primero, luego el texto ──────────────────────────
    // Por qué en este orden: al enviar a WhatsApp, la imagen se ve primero
    // en el chat y el mensaje de texto le da contexto inmediatamente después.
    // Si el orden fuera texto→imagen, el chat mostraría el texto "huérfano"
    // sin que el usuario haya visto la foto aún.
    const cached = await prepareCachedImage(imageUri, 'panial');
    if (cached) {
      try {
        await Sharing.shareAsync(cached, {
          mimeType:    'image/jpeg',
          dialogTitle: `📷 Foto del pañal — ${record.babyName}`,
          UTI:         'public.jpeg',
        });
      } catch {
        // Si la foto falla (permisos, etc.), continuamos con el texto solo
      }
      await delay(600);
    }

    // Ahora el texto completo
    await Share.share(
      { message, title: `🍑 Pañal de ${record.babyName}` },
      { dialogTitle: `Datos del pañal — ${record.babyName}` }
    );

  } else {
    // ── Sin foto: share nativo directo ────────────────────────────────────
    const typeLabels: Record<string, string> = {
      diaper:  `🍑 Pañal de ${record.babyName}`,
      feeding: `🍼 Toma de ${record.babyName}`,
      sleep:   `😴 Sueño de ${record.babyName}`,
      event:   `📝 Evento de ${record.babyName}`,
      growth:  `📈 Medición de ${record.babyName}`,
    };
    await Share.share(
      { message, title: typeLabels[record.type] ?? `Registro de ${record.babyName}` },
      { dialogTitle: typeLabels[record.type] ?? `Registro de ${record.babyName}` }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// shareMultipleRecords — compartir N registros en secuencia
// ─────────────────────────────────────────────────────────────────────────────

export async function shareMultipleRecords(records: AnyShareData[]): Promise<void> {
  for (let i = 0; i < records.length; i++) {
    await shareSingleRecord(records[i]);
    if (i < records.length - 1) {
      await delay(800);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// buildReportText + shareReport — resumen del período (stats)
// ─────────────────────────────────────────────────────────────────────────────

function stars2(n: number, max = 5): string {
  return stars(n, max);
}

function diffLine(
  curr: number, prev: number, prevLabel: string, unit: string,
  fmt: (n: number) => string = String,
): string {
  const diff    = curr - prev;
  const pctDiff = prev > 0 ? Math.round((diff / prev) * 100) : null;
  const arrow   = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
  const pctStr  = pctDiff != null ? ` (${diff > 0 ? '+' : ''}${pctDiff}%)` : '';
  return `   📊 vs ${prevLabel}: ${arrow} ${fmt(Math.abs(diff))} ${unit}${pctStr}`;
}

export function buildReportText(
  babyName:  string,
  range:     RangeType,
  refDate:   Date,
  stats:     PeriodStats,
  prevStats: PeriodStats,
  prevLabel: string,
): string {
  const rangeLabel = formatRangeLabel(range, refDate);
  const now = new Date().toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const L: string[] = [];

  L.push(`🌙 *Reporte de ${babyName}*`);
  L.push(`📅 ${rangeLabel}  |  generado ${now}`);
  L.push('');

  // ── Tomas ──
  L.push('━━━━━━━━━━━━━━━━━━━━');
  L.push(`🍼 *TOMAS* — ${stats.feedingCount} sesiones`);
  if (stats.feedingCount > 0) {
    L.push(`   ⏱ Tiempo total: ${formatDuration(stats.feedingTotalSec)}`);
    L.push(`   ⌀ Promedio:     ${formatDuration(stats.feedingAvgSec)} por toma`);
    for (const [t, cnt] of Object.entries(stats.feedingByType).sort((a, b) => b[1] - a[1])) {
      const pct = Math.round((cnt / stats.feedingCount) * 100);
      L.push(`   ${FEEDING_TYPE_LABELS[t] ?? t}: ${cnt} (${pct}%)`);
      if (t === 'bottle') {
        for (const [sub, sc] of Object.entries(stats.feedingBySubtype))
          L.push(`     • ${BOTTLE_SUBTYPE_LABELS[sub] ?? sub}: ${sc}`);
      }
    }
  }
  if (stats.feedingCount !== prevStats.feedingCount)
    L.push(diffLine(stats.feedingCount, prevStats.feedingCount, prevLabel, 'sesiones'));
  L.push('');

  // ── Sueño ──
  L.push('━━━━━━━━━━━━━━━━━━━━');
  L.push(`😴 *SUEÑO* — ${stats.sleepCount} siestas`);
  if (stats.sleepCount > 0) {
    L.push(`   ⏱ Total:   ${formatDuration(stats.sleepTotalSec)}`);
    L.push(`   ⌀ Prom.:   ${formatDuration(stats.sleepAvgSec)} por siesta`);
  } else {
    L.push('   Sin siestas registradas');
  }
  if (stats.sleepTotalSec !== prevStats.sleepTotalSec)
    L.push(diffLine(stats.sleepTotalSec, prevStats.sleepTotalSec, prevLabel, '', formatDuration));
  L.push('');

  // ── Pañales ──
  L.push('━━━━━━━━━━━━━━━━━━━━');
  L.push(`🍑 *PAÑALES* — ${stats.diaperCount} cambios`);
  if (stats.diaperCount > 0) {
    L.push(`   💧 Pipí prom.:  ${stars2(stats.diaperPeeAvg)}  ${stats.diaperPeeAvg}/5`);
    L.push(`   💩 Popó prom.:  ${stars2(stats.diaperPoopAvg)}  ${stats.diaperPoopAvg}/5`);
    if (stats.diaperWithPoop > 0)
      L.push(`   💩 Con popó:  ${stats.diaperWithPoop} (${Math.round((stats.diaperWithPoop / stats.diaperCount) * 100)}%)`);
  }
  if (stats.diaperCount !== prevStats.diaperCount)
    L.push(diffLine(stats.diaperCount, prevStats.diaperCount, prevLabel, 'cambios'));
  L.push('');

  // ── Comportamiento entre tomas ──
  if (stats.interFeedingEvents && stats.interFeedingEvents.length > 0) {
    L.push('━━━━━━━━━━━━━━━━━━━━');
    L.push('🔄 *ENTRE TOMAS*');
    for (const ev of stats.interFeedingEvents) {
      const lbl = EVENT_TYPE_LABELS[ev.typeId] ?? ev.typeId;
      L.push(`   ${lbl}: ${ev.count} veces`);
      if (ev.avgMinAfterFeeding != null)
        L.push(`     ↳ ~${ev.avgMinAfterFeeding} min después de una toma`);
    }
    L.push('');
  }

  // ── Crecimiento ──
  if (stats.latestGrowth) {
    const g = stats.latestGrowth;
    L.push('━━━━━━━━━━━━━━━━━━━━');
    L.push('📈 *CRECIMIENTO* (último registro)');
    if (g.weightGrams != null) L.push(`   ⚖️ Peso:   ${(g.weightGrams / 1000).toFixed(3)} kg`);
    if (g.heightMm   != null) L.push(`   📏 Talla:  ${(g.heightMm / 10).toFixed(1)} cm`);
    if (g.headCircMm != null) L.push(`   🔵 Cráneo: ${(g.headCircMm / 10).toFixed(1)} cm`);
    L.push('');
  }

  // ── Otros eventos ──
  const otherTypes = Object.entries(stats.eventsByType)
    .filter(([k]) => k !== 'diaper')
    .sort((a, b) => b[1] - a[1]);
  if (otherTypes.length > 0) {
    L.push('━━━━━━━━━━━━━━━━━━━━');
    L.push('📋 *OTROS EVENTOS*');
    for (const [tid, cnt] of otherTypes) {
      const prev = prevStats.eventsByType[tid] ?? 0;
      const arrow = cnt > prev ? '↑' : cnt < prev ? '↓' : '=';
      L.push(`   ${EVENT_TYPE_LABELS[tid] ?? tid}: ${cnt} ${prev > 0 ? `(${arrow} ant: ${prev})` : ''}`);
    }
    L.push('');
  }

  L.push('━━━━━━━━━━━━━━━━━━━━');
  L.push('_Enviado desde Cielo App 🌙_');
  return L.join('\n');
}

export async function shareReport(params: {
  babyName:  string;
  range:     RangeType;
  refDate:   Date;
  stats:     PeriodStats;
  prevStats: PeriodStats;
  prevLabel: string;
}) {
  const text = buildReportText(
    params.babyName, params.range, params.refDate,
    params.stats, params.prevStats, params.prevLabel,
  );
  await Share.share(
    { title: `Reporte de ${params.babyName}`, message: text },
    {
      dialogTitle: `Compartir reporte — ${params.babyName}`,
      subject:     `Reporte ${formatRangeLabel(params.range, params.refDate)} · ${params.babyName}`,
    }
  );
}
