/**
 * shareReport — genera y comparte el reporte del bebé.
 *
 * ESTRATEGIA DE IMÁGENES (segura, sin subir nada a servidores):
 * ─────────────────────────────────────────────────────────────
 * Todas las fotos son URIs file:// locales. Solo salen del dispositivo
 * si el usuario lo elige explícitamente en el share sheet nativo.
 *
 * Flujo:
 * 1. Genera el texto estructurado del período.
 * 2. Guarda el texto como .txt en cacheDirectory (temporal, solo para compartir).
 * 3. Copia las imágenes de pañal al cacheDirectory con nombres legibles.
 * 4. En Android: lanza un Intent ACTION_SEND_MULTIPLE via expo-intent-launcher
 *    (si está disponible) o usa expo-sharing en serie.
 *    En iOS: usa el share sheet nativo que ya acepta múltiples archivos
 *    pasando un array de URIs.
 *
 * NOTA SOBRE PRIVACIDAD:
 * Las fotos de pañal son sensibles. Este módulo NUNCA las sube a ningún
 * servidor — solo las pasa al sistema operativo a través del share sheet
 * nativo. El usuario decide a dónde las envía.
 */
import { Share, Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { formatDuration } from '@/src/db/client';
import type { PeriodStats, RangeType } from '@/src/hooks/useStats';
import { formatRangeLabel } from '@/src/hooks/useStats';

// ─── Etiquetas ────────────────────────────────────────────────────────────────

const FEEDING_TYPE_LABELS: Record<string, string> = {
  breast_left:  '🤱 Pecho Izq.',
  breast_right: '🤱 Pecho Der.',
  bottle:       '🍼 Biberón',
};
const BOTTLE_SUBTYPE_LABELS: Record<string, string> = {
  breast_milk: 'Leche materna',
  formula:     'Fórmula',
  mixed:       'Mixta',
  other:       'Otro',
};
const EVENT_LABELS: Record<string, string> = {
  diaper:        '🍑 Pañales',
  burp:          '💨 Eructos',
  regurgitation: '🤧 Regurgitaciones',
  vomit:         '🤮 Vómitos',
  medication:    '💊 Medicamentos',
  weight:        '⚖️ Peso',
  height:        '📏 Estatura',
  temperature:   '🌡️ Temperatura',
  note:          '📝 Notas',
};

// ─── Genera texto estructurado del período ────────────────────────────────────

export function buildReportText(
  babyName: string,
  range: RangeType,
  refDate: Date,
  stats: PeriodStats,
  prevStats: PeriodStats,
  prevLabel: string,
): string {
  const rangeLabel = formatRangeLabel(range, refDate);
  const now = new Date().toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const lines: string[] = [];

  lines.push(`🌙 *Reporte de ${babyName}*`);
  lines.push(`📅 ${rangeLabel}  |  generado ${now}`);
  lines.push('');

  // ── Tomas ──
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`🍼 *TOMAS* — ${stats.feedingCount} sesiones`);
  if (stats.feedingCount > 0) {
    lines.push(`   ⏱ Tiempo total: ${formatDuration(stats.feedingTotalSec)}`);
    lines.push(`   ⌀ Promedio: ${formatDuration(stats.feedingAvgSec)} por toma`);
    if (Object.keys(stats.feedingByType).length > 0) {
      lines.push('   Por tipo:');
      for (const [type, count] of Object.entries(stats.feedingByType).sort((a, b) => b[1] - a[1])) {
        const lbl    = FEEDING_TYPE_LABELS[type] ?? type;
        const pctStr = `${Math.round((count / stats.feedingCount) * 100)}%`;
        lines.push(`     ${lbl}: ${count} sesiones (${pctStr})`);
        if (type === 'bottle' && Object.keys(stats.feedingBySubtype).length > 0) {
          for (const [sub, cnt] of Object.entries(stats.feedingBySubtype)) {
            lines.push(`       • ${BOTTLE_SUBTYPE_LABELS[sub] ?? sub}: ${cnt}`);
          }
        }
      }
    }
  }
  const feedDiff = diffLine(stats.feedingCount, prevStats.feedingCount, prevLabel, 'sesiones');
  if (feedDiff) lines.push(feedDiff);
  lines.push('');

  // ── Sueño ──
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`😴 *SUEÑO* — ${stats.sleepCount} siestas`);
  if (stats.sleepCount > 0) {
    lines.push(`   ⏱ Tiempo total: ${formatDuration(stats.sleepTotalSec)}`);
    lines.push(`   ⌀ Promedio: ${formatDuration(stats.sleepAvgSec)} por siesta`);
  } else {
    lines.push('   Sin siestas registradas');
  }
  const sleepDiff = diffLine(stats.sleepTotalSec, prevStats.sleepTotalSec, prevLabel, '', formatDuration);
  if (sleepDiff) lines.push(sleepDiff);
  lines.push('');

  // ── Pañales ──
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`🍑 *PAÑALES* — ${stats.diaperCount} cambios`);
  if (stats.diaperCount > 0) {
    lines.push(`   💧 Intensidad pipí: ${stats.diaperPeeAvg}/5 prom.`);
    lines.push(`   💩 Intensidad popó: ${stats.diaperPoopAvg}/5 prom.`);
    if (stats.diaperWithPoop > 0) {
      lines.push(`   💩 Con popó: ${stats.diaperWithPoop} (${Math.round((stats.diaperWithPoop / stats.diaperCount) * 100)}%)`);
    }
    if (stats.diaperImageUris.length > 0) {
      lines.push(`   📷 ${stats.diaperImageUris.length} foto(s) adjunta(s) abajo`);
    }
  } else {
    lines.push('   Sin cambios registrados');
  }
  const diaperDiff = diffLine(stats.diaperCount, prevStats.diaperCount, prevLabel, 'cambios');
  if (diaperDiff) lines.push(diaperDiff);
  lines.push('');

  // ── Otros eventos ──
  const otherTypes = Object.entries(stats.eventsByType)
    .filter(([k]) => k !== 'diaper')
    .sort((a, b) => b[1] - a[1]);

  if (otherTypes.length > 0) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📋 *OTROS EVENTOS*');
    for (const [typeId, count] of otherTypes) {
      const prevCount = prevStats.eventsByType[typeId] ?? 0;
      const arrow     = count > prevCount ? '↑' : count < prevCount ? '↓' : '=';
      lines.push(`   ${EVENT_LABELS[typeId] ?? typeId}: ${count} ${prevCount > 0 ? `(${arrow} ant: ${prevCount})` : ''}`);
    }
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('_Enviado desde Cielo App 🌙_');

  return lines.join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diffLine(
  curr: number,
  prev: number,
  prevLabel: string,
  unit: string,
  fmt: (n: number) => string = String,
): string | null {
  if (curr === 0 && prev === 0) return null;
  const diff    = curr - prev;
  const pctDiff = prev > 0 ? Math.round((diff / prev) * 100) : null;
  const arrow   = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
  const pctStr  = pctDiff != null ? ` (${diff > 0 ? '+' : ''}${pctDiff}%)` : '';
  return `   📊 vs ${prevLabel}: ${arrow} ${fmt(Math.abs(diff))} ${unit}${pctStr}`;
}

// ─── Preparar archivos temporales ────────────────────────────────────────────

async function prepareFilesForSharing(
  babyName: string,
  text: string,
  imageUris: string[],
): Promise<{ txtPath: string; imgPaths: string[] }> {
  const safeName = babyName.replace(/[^a-zA-Z0-9]/g, '_');
  const dir      = FileSystem.cacheDirectory + `cielo_report_${safeName}/`;

  // Asegurarse que el directorio existe
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  // Guardar texto
  const txtPath = dir + `reporte_${safeName}.txt`;
  await FileSystem.writeAsStringAsync(txtPath, text, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Copiar imágenes al directorio temporal con nombres legibles
  const imgPaths: string[] = [];
  for (let i = 0; i < imageUris.length; i++) {
    const src = imageUris[i];
    if (!src) continue;
    try {
      // Determinar extensión
      const ext = src.split('.').pop()?.toLowerCase() ?? 'jpg';
      const dest = dir + `panial_${i + 1}.${ext}`;
      await FileSystem.copyAsync({ from: src, to: dest });
      imgPaths.push(dest);
    } catch {
      // Si no se puede copiar (la foto original fue movida o eliminada), saltamos
    }
  }

  return { txtPath, imgPaths };
}

// ─── Share principal ──────────────────────────────────────────────────────────

export async function shareReport(params: {
  babyName: string;
  range: RangeType;
  refDate: Date;
  stats: PeriodStats;
  prevStats: PeriodStats;
  prevLabel: string;
}) {
  const text      = buildReportText(
    params.babyName, params.range, params.refDate,
    params.stats, params.prevStats, params.prevLabel,
  );
  const imageUris = params.stats.diaperImageUris.filter(Boolean);
  const canShare  = await Sharing.isAvailableAsync();

  if (imageUris.length === 0) {
    // ── Sin imágenes: Share nativo directo (texto puro) ──────────────────────
    // En WhatsApp, iOS y Android el texto llega directamente al chat.
    await Share.share(
      {
        title:   `Reporte de ${params.babyName}`,
        message: text,
      },
      {
        dialogTitle: `Compartir reporte — ${params.babyName}`,
        subject:     `Reporte ${formatRangeLabel(params.range, params.refDate)} · ${params.babyName}`,
      }
    );
    return;
  }

  // ── Con imágenes ──────────────────────────────────────────────────────────
  // Preparar archivos en caché
  const { txtPath, imgPaths } = await prepareFilesForSharing(
    params.babyName, text, imageUris,
  );

  if (!canShare) {
    // Fallback: share solo el texto si expo-sharing no está disponible
    await Share.share({ title: `Reporte de ${params.babyName}`, message: text });
    return;
  }

  if (imgPaths.length === 1) {
    // ── 1 imagen: compartir la imagen (el usuario la selecciona en WhatsApp
    //    y puede pegar el texto del reporte como caption)
    //    Para no perder el texto, lo compartimos primero y luego la imagen.
    await Sharing.shareAsync(txtPath, {
      mimeType:    'text/plain',
      dialogTitle: `Reporte de ${params.babyName}`,
      UTI:         'public.plain-text',
    });
    // Pequeño delay para que el sheet anterior se cierre en Android
    await new Promise(r => setTimeout(r, 600));
    await Sharing.shareAsync(imgPaths[0], {
      mimeType:    'image/jpeg',
      dialogTitle: `📷 Foto de pañal — ${params.babyName}`,
    });

  } else {
    // ── Múltiples imágenes ────────────────────────────────────────────────────
    // Estrategia: primero el reporte de texto, luego cada foto individualmente.
    // El usuario elige WhatsApp en cada share sheet y puede ir construyendo
    // un álbum en el mismo chat. Las fotos tienen nombres de archivo legibles
    // (panial_1.jpg, panial_2.jpg…) para que el contexto sea claro.
    //
    // NOTA: Android ACTION_SEND_MULTIPLE no está disponible directamente desde
    // expo-sharing. Si en el futuro se instala 'react-native-share' se puede
    // hacer en una sola invocación, pero no agrega una dependencia extra aquí.

    // 1. Texto del reporte
    await Sharing.shareAsync(txtPath, {
      mimeType:    'text/plain',
      dialogTitle: `📋 Reporte — ${params.babyName} (${imgPaths.length} fotos abajo)`,
      UTI:         'public.plain-text',
    });

    // 2. Cada foto
    for (let i = 0; i < imgPaths.length; i++) {
      await new Promise(r => setTimeout(r, 700)); // evitar overlap de sheets
      try {
        await Sharing.shareAsync(imgPaths[i], {
          mimeType:    'image/jpeg',
          dialogTitle: `📷 Foto ${i + 1}/${imgPaths.length} — ${params.babyName}`,
        });
      } catch {
        // foto individual falla → continuar con las demás
      }
    }
  }
}
