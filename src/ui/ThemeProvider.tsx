import React, { createContext, useContext } from "react";
import { colors, radius, spacing, typography } from "./theme";

const ThemeCtx = createContext({ colors, radius, spacing, typography });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeCtx.Provider value={{ colors, radius, spacing, typography }}>{children}</ThemeCtx.Provider>;
}
