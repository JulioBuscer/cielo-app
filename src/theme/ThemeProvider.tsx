import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Appearance } from "react-native";
import type { AppTheme } from "./types";
import { lightTheme, darkTheme } from "./themes";
import {
  getActiveThemeId,
  setActiveThemeId,
  getCustomThemes,
  saveCustomTheme,
} from "./themeStorage";

export interface ThemeManager {
  theme: AppTheme;
  activeId: string;
  setTheme: (id: string) => Promise<void>;
  refreshCustomThemes: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeManager | null>(null);

type ThemeMode = "light" | "dark" | "system" | "custom";

function resolveMode(
  mode: ThemeMode,
  systemScheme: "light" | "dark" | null
): string {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  if (mode === "system") return systemScheme ?? "light";
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(lightTheme);
  const [customThemes, setCustomThemes] = useState<AppTheme[]>([]);
  const [activeId, setActiveId] = useState<string>("light");
  const [mode, setMode] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark" | null>(
    null
  );

  const allThemes = [lightTheme, darkTheme, ...customThemes];

  useEffect(() => {
    const cs = Appearance.getColorScheme();
    setSystemScheme(cs === "dark" ? "dark" : "light");
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await getActiveThemeId();
      const savedMode: ThemeMode =
        saved === "light" || saved === "dark" ? saved : "system";
      setMode(savedMode);
      const custom = await getCustomThemes();
      setCustomThemes(custom);
      const all = [lightTheme, darkTheme, ...custom];
      const found = all.find((t) => t.id === saved) ?? lightTheme;
      setActiveId(found.id);
      setThemeState(found);
      if (savedMode === "dark") {
        Appearance.setColorScheme("dark");
      } else if (savedMode === "light") {
        Appearance.setColorScheme("light");
      } else {
        Appearance.setColorScheme(null);
      }
    })();
  }, []);

  // Auto-switch for "system" mode
  useEffect(() => {
    if (mode !== "system") return;
    const targetId = resolveMode("system", systemScheme);
    const found = allThemes.find((t) => t.id === targetId);
    if (found && found.id !== activeId) {
      setActiveId(found.id);
      setThemeState(found);
    }
  }, [systemScheme, mode, activeId]);

  const setTheme = useCallback(
    async (idOrMode: string) => {
      if (idOrMode === "light" || idOrMode === "dark") {
        setMode(idOrMode);
        setActiveId(idOrMode);
        const found = idOrMode === "dark" ? darkTheme : lightTheme;
        setThemeState(found);
        Appearance.setColorScheme(idOrMode);
        await setActiveThemeId(idOrMode);
        return;
      }
      const found = allThemes.find((t) => t.id === idOrMode);
      if (found) {
        setMode("custom");
        setActiveId(found.id);
        setThemeState(found);
        await setActiveThemeId(found.id);
      }
    },
    [allThemes]
  );

  const refreshCustomThemes = useCallback(async () => {
    const custom = await getCustomThemes();
    setCustomThemes(custom);
  }, []);

  const manager: ThemeManager = {
    theme,
    activeId,
    setTheme,
    refreshCustomThemes,
  };

  return (
    <ThemeContext.Provider value={manager}>{children}</ThemeContext.Provider>
  );
}
