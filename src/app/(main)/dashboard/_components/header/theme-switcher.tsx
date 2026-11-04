"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

export function ThemeSwitcher() {
  const { themeMode, setPreference } = usePreferencesStore(
    useShallow((state) => ({
      themeMode: state.values.theme_mode,
      setPreference: state.setPreference,
    })),
  );

  const cycleTheme = () => {
    const nextTheme = themeMode === "light" ? "dark" : "light";

    setPreference("theme_mode", nextTheme);
  };

  return (
    <Button size="icon" onClick={cycleTheme} aria-label={`Current theme: ${themeMode}. Click to cycle themes`}>
      <span key={themeMode} className="noreva-theme-icon inline-flex items-center justify-center" aria-hidden="true">
        {/* SYSTEM */}
        <Monitor className="hidden [html[data-theme-mode=system]_&]:block" />

        {/* DARK (resolved) */}
        <Sun className="hidden dark:block [html[data-theme-mode=system]_&]:hidden" />

        {/* LIGHT (resolved) */}
        <Moon className="block dark:hidden [html[data-theme-mode=system]_&]:hidden" />
      </span>
    </Button>
  );
}
