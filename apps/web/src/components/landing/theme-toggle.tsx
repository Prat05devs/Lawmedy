"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_KEY, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("day");
  useEffect(() => setTheme(document.documentElement.dataset.theme === "night" ? "night" : "day"), []);

  const next: Theme = theme === "night" ? "day" : "night";
  const label = next === "night" ? "Switch to night mode" : "Switch to day mode";
  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem(THEME_KEY, next); } catch { /* the choice lasts for this visit */ }
    setTheme(next);
  };

  return (
    <button type="button" className="lx-mode" onClick={toggle} aria-label={label} title={label}>
      {theme === "night" ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </button>
  );
}
