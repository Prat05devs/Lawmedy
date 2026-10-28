import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { colorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { setColorMode } from "@/lib/theme";

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

// Every screen reads the shared colours while rendering, so a mode change swaps those colours,
// switches the UI kit's variables, and re-renders the app below this provider.
function apply(mode: Mode) {
  setColorMode(mode);
  try { colorScheme.set(mode === "night" ? "dark" : "light"); } catch { /* the UI kit keeps day colours */ }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("day");
  useEffect(() => {
    void SecureStore.getItemAsync(KEY).then((v) => { if (v === "night") { apply("night"); setMode("night"); } }).catch(() => undefined);
  }, []);
  const value = useMemo<Ctx>(() => ({
    mode,
    c: palettes[mode],
    toggle: () => {
      const next: Mode = mode === "night" ? "day" : "night";
      apply(next);
      void SecureStore.setItemAsync(KEY, next).catch(() => undefined);
      setMode(next);
    },
  }), [mode]);
  return <ThemeContext.Provider value={value}><React.Fragment key={mode}>{children}</React.Fragment></ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);

// Light status-bar text in night mode, dark in day mode.
export function ThemedStatusBar() {
  const { mode } = useAppTheme();
  return <StatusBar style={mode === "night" ? "light" : "dark"} />;
}
