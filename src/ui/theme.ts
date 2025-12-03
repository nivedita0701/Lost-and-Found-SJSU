// ui/theme.ts
export type ResolvedThemeMode = "light" | "dark";
export type ThemeMode = ResolvedThemeMode | "system";
export type Accent = "blue" | "gold" | "purple";

export type ThemeColors = {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  shadow: string;
  blue: string;
  gold: string;
  purple: string;
  red: string;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
};

export const typography = {
  h1: 24,
  h2: 20,
  body: 16,
  small: 13,
};

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

function buildColors(mode: ResolvedThemeMode, accent: Accent): ThemeColors {
  const isDark = mode === "dark";

  const baseAccent =
    accent === "gold"
      ? "#FBBF24"
      : accent === "purple"
      ? "#A855F7"
      : "#0B1221"; // blue default

  return {
    background: isDark ? "#020617" : "#F3F4F6",
    card:       isDark ? "#020617" : "#FFFFFF",   // ← slightly lighter than background
    text:       isDark ? "#F9FAFB" : "#0B1221",
    textMuted:  isDark ? "#9CA3AF" : "#6B7280",
    border:     isDark ? "#1F2937" : "#E5E7EB",
    shadow:     isDark ? "rgba(0,0,0,0.9)" : "rgba(15,23,42,0.25)",
    blue: baseAccent,
    gold: "#FBBF24",
    purple: "#A855F7",
    red: "#DC2626",
  };
}


export function buildTheme(mode: ResolvedThemeMode, accent: Accent): Theme {
  return {
    colors: buildColors(mode, accent),
    spacing,
    radius,
    typography,
  };
}
