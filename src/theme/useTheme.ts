import { useContext } from "react";
import { ThemeContext, type ThemeManager } from "./ThemeProvider";

export function useTheme(): ThemeManager {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
