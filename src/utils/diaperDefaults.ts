import AsyncStorage from "@react-native-async-storage/async-storage";
import { KEYS } from "@/src/utils/storage";

export const DEFAULT_PEE_INTENSITY = { min: 1, max: 4, zones: [
  { min: 1, max: 1, color: "#BBDEFB", label: "Poquitita", emoji: "💧" },
  { min: 2, max: 2, color: "#64B5F6", label: "Poquita",   emoji: "💧" },
  { min: 3, max: 3, color: "#1E88E5", label: "Normal",    emoji: "💦" },
  { min: 4, max: 4, color: "#0D47A1", label: "Mucha",     emoji: "🌊" },
] };

export const DEFAULT_POOP_INTENSITY = { min: 1, max: 4, zones: [
  { min: 1, max: 1, color: "#D2B48C", label: "Poquitita", emoji: "💩" },
  { min: 2, max: 2, color: "#A0785A", label: "Poquita",   emoji: "💩" },
  { min: 3, max: 3, color: "#8B6914", label: "Normal",    emoji: "💩" },
  { min: 4, max: 4, color: "#5C4033", label: "Mucha",     emoji: "💩💩" },
] };

export const DEFAULT_PEE_HEALTH = { enabled: true, min: 1, max: 8, zones: [
  { min: 1, max: 1, color: "#E8F5E9", label: "Transparente",  emoji: "💧" },
  { min: 2, max: 2, color: "#FFF9C4", label: "Amarillo claro", emoji: "💛" },
  { min: 3, max: 3, color: "#FFE082", label: "Amarillo",      emoji: "💛" },
  { min: 4, max: 4, color: "#FFB300", label: "Amarillo oscuro", emoji: "🟡" },
  { min: 5, max: 5, color: "#FF8F00", label: "Ámbar",         emoji: "🟠" },
  { min: 6, max: 6, color: "#E65100", label: "Naranja",       emoji: "🟠" },
  { min: 7, max: 7, color: "#BF360C", label: "Anaranjado rojizo", emoji: "🔶", isAlert: true, note: "Podría indicar sangre. Observa y consulta si persiste. (Stanford Medicine)" },
  { min: 8, max: 8, color: "#8D6E63", label: "Café/Rojizo",   emoji: "🚨", isAlert: true, note: "Posible sangre. Consulta con tu pediatra. (Mayo Clinic)" },
] };

export const DEFAULT_POOP_HEALTH = { enabled: true, min: 1, max: 8, zones: [
  { min: 1, max: 1, color: "#8BC34A", label: "Verde",   emoji: "🟢" },
  { min: 2, max: 2, color: "#FFC107", label: "Amarillo", emoji: "🟡" },
  { min: 3, max: 3, color: "#8B4513", label: "Marrón",  emoji: "🟤" },
  { min: 4, max: 4, color: "#E65100", label: "Naranja", emoji: "🟠" },
  { min: 5, max: 5, color: "#9E9E9E", label: "Arcilla", emoji: "🩻",  isAlert: true, note: "Poco común. Puede indicar problema hepático (vías biliares). Consulta con tu pediatra. (Mayo Clinic, AAP)" },
  { min: 6, max: 6, color: "#B71C1C", label: "Rojo",    emoji: "💉",  isAlert: true, note: "Sangre fresca. Posible fisura anal o alergia a proteína. Consulta con tu pediatra. (Mayo Clinic, NHS)" },
  { min: 7, max: 7, color: "#212121", label: "Negro",   emoji: "⚫",  isAlert: true, note: "Sangre digerida (excepto meconio en RN). Consulta con tu pediatra. (Mayo Clinic, NHS)" },
  { min: 8, max: 8, color: "#EEEEEE", label: "Blanco",  emoji: "⚪",  isAlert: true, note: "Puede indicar obstrucción biliar. Consulta con tu pediatra lo antes posible. (Mayo Clinic, AAP)" },
] };

export const DEFAULT_POOP_CONSISTENCY = { min: 1, max: 5, zones: [
  { min: 1, max: 1, color: "#6D4C41", label: "Dura",   emoji: "💎", isAlert: true, note: "Bristol tipo 1-2: estreñimiento. Ofrece más líquidos, consulta si persiste. (NHS, Bristol Stool Chart)" },
  { min: 2, max: 2, color: "#8D6E63", label: "Sólida", emoji: "🍫" },
  { min: 3, max: 3, color: "#A1887F", label: "Pastosa", emoji: "🥜" },
  { min: 4, max: 4, color: "#BCAAA4", label: "Líquida", emoji: "💧", note: "En lactancia materna puede ser normal (BC tipo 6). Si es muy frecuente o acuosa, pasa al nivel 5." },
  { min: 5, max: 5, color: "#EF5350", label: "Acuosa",  emoji: "🌊", isAlert: true, note: "Bristol tipo 7: diarrea. Vigila signos de deshidratación (boca seca, menos pañales mojados). (NHS, Bristol Stool Chart)" },
] };

export interface DiaperConfigs {
  peeIntensity: typeof DEFAULT_PEE_INTENSITY;
  poopIntensity: typeof DEFAULT_POOP_INTENSITY;
  peeHealth: typeof DEFAULT_PEE_HEALTH;
  poopHealth: typeof DEFAULT_POOP_HEALTH;
  poopConsistency: typeof DEFAULT_POOP_CONSISTENCY;
}

export async function getDiaperConfigs(): Promise<DiaperConfigs> {
  const [pi, poi, ph, poh, pc] = await Promise.all([
    AsyncStorage.getItem(KEYS.PEE_INTENSITY_CONFIG),
    AsyncStorage.getItem(KEYS.POOP_INTENSITY_CONFIG),
    AsyncStorage.getItem(KEYS.PEE_HEALTH_CONFIG),
    AsyncStorage.getItem(KEYS.POOP_HEALTH_CONFIG),
    AsyncStorage.getItem(KEYS.POOP_CONSISTENCY_CONFIG),
  ]);
  return {
    peeIntensity: pi ? tryParse(pi, DEFAULT_PEE_INTENSITY) : DEFAULT_PEE_INTENSITY,
    poopIntensity: poi ? tryParse(poi, DEFAULT_POOP_INTENSITY) : DEFAULT_POOP_INTENSITY,
    peeHealth: ph ? tryParse(ph, DEFAULT_PEE_HEALTH) : DEFAULT_PEE_HEALTH,
    poopHealth: poh ? tryParse(poh, DEFAULT_POOP_HEALTH) : DEFAULT_POOP_HEALTH,
    poopConsistency: pc ? tryParse(pc, DEFAULT_POOP_CONSISTENCY) : DEFAULT_POOP_CONSISTENCY,
  };
}

function tryParse<T>(json: string, fallback: T): T {
  try { return JSON.parse(json); } catch { return fallback; }
}
