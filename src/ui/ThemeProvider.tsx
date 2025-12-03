// ui/ThemeProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildTheme,
  type Theme,
  type ThemeMode,
  type ResolvedThemeMode,
  type Accent,
} from "./theme";

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;          // "system" | "light" | "dark"
  accent: Accent;           // "blue" | "gold" | "purple"
  setMode: (m: ThemeMode) => void;
  setAccent: (a: Accent) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "prefs.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() || Appearance.getColorScheme() || "light";

  // user-chosen values
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [accent, setAccentState] = useState<Accent>("blue");

  // resolve "system" -> "light" | "dark"
  const resolvedMode: ResolvedThemeMode =
    mode === "system" ? (systemScheme as ResolvedThemeMode) : mode;

  const theme = useMemo(
    () => buildTheme(resolvedMode, accent),
    [resolvedMode, accent]
  );

  // hydrate from AsyncStorage once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          mode?: ThemeMode;
          accent?: Accent;
        };
        if (parsed.mode) setModeState(parsed.mode);
        if (parsed.accent) setAccentState(parsed.accent);
      } catch {
        // ignore
      }
    })();
  }, []);

  // helpers that also persist
  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: m, accent })
    ).catch(() => {});
  };

  const setAccent = (a: Accent) => {
    setAccentState(a);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode, accent: a })
    ).catch(() => {});
  };

  const value = useMemo(
    () => ({ theme, mode, accent, setMode, setAccent }),
    [theme, mode, accent]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
