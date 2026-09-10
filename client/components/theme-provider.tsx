"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "survey-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeSnapshot {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
}

interface ThemeContextValue extends ThemeSnapshot {
  setTheme: (theme: Theme) => void;
}

const SERVER_SNAPSHOT: ThemeSnapshot = { theme: "system", resolvedTheme: "light" };

const ThemeContext = createContext<ThemeContextValue | null>(null);

const listeners = new Set<() => void>();
let snapshot: ThemeSnapshot | null = null;

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (isTheme(stored)) {
      return stored;
    }
  } catch {
    return "system";
  }

  return "system";
}

function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be blocked (private browsing or hardened settings); the choice still applies for this session.
  }
}

function computeSnapshot(): ThemeSnapshot {
  const theme = readStoredTheme();

  return {
    theme,
    resolvedTheme: theme === "system" ? getSystemTheme() : theme,
  };
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function getSnapshot(): ThemeSnapshot {
  snapshot ??= computeSnapshot();
  return snapshot;
}

function emit(): void {
  snapshot = computeSnapshot();
  applyTheme(snapshot.resolvedTheme);

  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const media = window.matchMedia(DARK_QUERY);
  const handleChange = () => emit();

  media.addEventListener("change", handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function getServerSnapshot(): ThemeSnapshot {
  return SERVER_SNAPSHOT;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(getSnapshot().resolvedTheme);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
    emit();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
