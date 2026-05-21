import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";

export interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  isDark: false,
  setMode: () => {},
});

const STORAGE_KEY = "theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") {
        applyMode(v);
        setModeState(v);
      }
    });
  }, []);

  const applyMode = useCallback((m: ThemeMode) => {
    if (m === "light") {
      Appearance.setColorScheme("light");
    } else if (m === "dark") {
      Appearance.setColorScheme("dark");
    } else {
      Appearance.setColorScheme(null); // reset to system
    }
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    applyMode(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  }, [applyMode]);

  const isDark =
    mode === "dark" || (mode === "system" && Appearance.getColorScheme() === "dark");

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
