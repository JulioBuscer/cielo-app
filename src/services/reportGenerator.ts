import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import type { DiaperLog, Baby, Profile, GrowthLog } from '@/src/db/schema';
import { gramsToKg, mmToCm } from '@/src/hooks/useGrowthLogs';

export function buildDiaperCaption(log: DiaperLog, baby: Baby, profile: Profile): string {
  const hora  = new Date(log.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date(log.timestamp).toLocaleDateString('es-MX');
  const emoji = ['', '🟢', '🟡', '🟠', '🔴', '☠️'];
  const alertas = [
    log.hasBlood && '🩸 Sangre',
    log.hasMucus && '🤧 Mucosidad',
    log.hasDiarrhea && '⚠️ Diarrea',
  ].filter(Boolean).join(' | ');

  return [
    `*🌙 Reporte Cielo — ${baby.name}*`,
    `📅 ${fecha} a las ${hora}`,
    `👤 ${profile.name} (${profile.role})`,
    ``,
    `💧 Pipi: ${emoji[log.peeIntensity ?? 0] || 'No'} (${log.peeIntensity}/5)`,
    `💩 Popó: ${emoji[log.poopIntensity ?? 0] || 'No'} (${log.poopIntensity}/5)`,
    log.color        ? `🎨 Color: ${log.color}` : null,
    log.consistency  ? `🧪 Consistencia: ${log.consistency}` : null,
    ``,
    alertas ? `🚨 *ALERTAS:* ${alertas}` : `✅ Sin alertas médicas`,
    log.notes ? `📝 ${log.notes}` : null,
    ``,
    `_Enviado desde Cielo App_`,
  ].filter(Boolean).join('\n');
}

export function buildGrowthCaption(log: GrowthLog, baby: Baby, profile: Profile): string {
  const fecha = new Date(log.timestamp).toLocaleDateString('es-MX');
  return [
    `*📏 Reporte de Crecimiento — ${baby.name}*`,
    `📅 ${fecha}`,
    `👤 ${profile.name} (${profile.role})`,
    ``,
    log.weightGrams ? `⚖️ Peso: ${gramsToKg(log.weightGrams)} kg` : null,
    log.heightMm    ? `📐 Estatura: ${mmToCm(log.heightMm)} cm` : null,
    log.headCircMm  ? `🔵 Cef.: ${mmToCm(log.headCircMm)} cm` : null,
    log.notes       ? `📝 ${log.notes}` : null,
    ``,
    `_Enviado desde Cielo App_`,
  ].filter(Boolean).join('\n');
}

export async function shareDiaperReport(log: DiaperLog, baby: Baby, profile: Profile) {
  const caption = buildDiaperCaption(log, baby, profile);
  if (log.imageUri) {
    await Clipboard.setStringAsync(caption);
    await Sharing.shareAsync(log.imageUri, {
      mimeType: 'image/jpeg',
      dialogTitle: '📋 Caption copiado — pega en WhatsApp',
    });
  } else {
    const tmp = `${FileSystem.cacheDirectory}reporte-cielo.txt`;
    await FileSystem.writeAsStringAsync(tmp, caption);
    await Sharing.shareAsync(tmp, { mimeType: 'text/plain', dialogTitle: 'Compartir reporte' });
  }
}

export async function shareGrowthReport(log: GrowthLog, baby: Baby, profile: Profile) {
  const caption = buildGrowthCaption(log, baby, profile);
  const tmp = `${FileSystem.cacheDirectory}crecimiento-cielo.txt`;
  await FileSystem.writeAsStringAsync(tmp, caption);
  await Sharing.shareAsync(tmp, { mimeType: 'text/plain', dialogTitle: 'Compartir reporte de crecimiento' });
}
