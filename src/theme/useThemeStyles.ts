import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./useTheme";
import type { AppTheme } from "./types";

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (
  colors: AppTheme["colors"]
) => T | StyleSheet.NamedStyles<T>;

export function useThemeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>
): T {
  const { theme } = useTheme();
  return useMemo(() => {
    const result = factory(theme.colors);
    return StyleSheet.create(result) as T;
  }, [theme]);
}
