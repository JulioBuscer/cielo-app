import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppTheme } from "./types";
import { lightTheme, darkTheme, lavenderTheme } from "./themes";

const ACTIVE_KEY = "theme_active_id";
const CUSTOM_KEY = "theme_custom_themes";

const builtIn: AppTheme[] = [lightTheme, darkTheme, lavenderTheme];

export async function getActiveThemeId(): Promise<string> {
  const id = await AsyncStorage.getItem(ACTIVE_KEY);
  return id ?? "light";
}

export async function setActiveThemeId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, id);
}

export async function getCustomThemes(): Promise<AppTheme[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCustomTheme(theme: AppTheme): Promise<void> {
  const themes = await getCustomThemes();
  const idx = themes.findIndex((t) => t.id === theme.id);
  if (idx >= 0) {
    themes[idx] = theme;
  } else {
    themes.push(theme);
  }
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(themes));
}

export async function deleteCustomTheme(id: string): Promise<void> {
  const themes = await getCustomThemes();
  await AsyncStorage.setItem(
    CUSTOM_KEY,
    JSON.stringify(themes.filter((t) => t.id !== id))
  );
}

export async function getAllThemes(): Promise<AppTheme[]> {
  const custom = await getCustomThemes();
  return [...builtIn, ...custom];
}

export async function getThemeById(id: string): Promise<AppTheme | null> {
  const all = await getAllThemes();
  return all.find((t) => t.id === id) ?? null;
}

export function getBuiltInThemes(): AppTheme[] {
  return builtIn;
}
