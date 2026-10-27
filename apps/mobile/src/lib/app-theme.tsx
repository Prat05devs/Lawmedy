import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";

// Day and night palettes, the same as the website: neutrals carry the screen, Mor is the one accent.
// Photo sections use `band`, a black fade, in both modes.
export type Mode = "day" | "night";
export type Palette = { bg: string; surface: string; surface2: string; ink: string; muted: string; line: string; accent: string; accentInk: string; tint: string };

export const palettes: Record<Mode, Palette> = {
  day: { bg: "#fafaf8", surface: "#ffffff", surface2: "#f2f2ee", ink: "#141414", muted: "#5c5c57", line: "#e4e4df", accent: "#0b6e69", accentInk: "#ffffff", tint: "#e7f2f0" },
  night: { bg: "#101312", surface: "#171b1a", surface2: "#1d2221", ink: "#eceeed", muted: "#a3a9a7", line: "#2a302e", accent: "#4fbfb3", accentInk: "#0b1413", tint: "rgba(79,191,179,0.14)" },
};
export const band = { ink: "#f5f5f3", muted: "rgba(245,245,243,0.78)", line: "rgba(255,255,255,0.18)", glass: "rgba(255,255,255,0.08)", accent: "#4fbfb3", accentInk: "#0b1413" };

const KEY = "lawmedy-theme";
type Ctx = { mode: Mode; c: Palette; toggle: () => void };
const ThemeContext = createContext<Ctx>({ mode: "day", c: palettes.day, toggle: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("day");
  useEffect(() => { void SecureStore.getItemAsync(KEY).then((v) => { if (v === "night" || v === "day") setMode(v); }).catch(() => undefined); }, []);
  const value = useMemo<Ctx>(() => ({
    mode,
    c: palettes[mode],
    toggle: () => setMode((m) => {
      const next = m === "night" ? "day" : "night";
      void SecureStore.setItemAsync(KEY, next).catch(() => undefined);
      return next;
    }),
  }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);
