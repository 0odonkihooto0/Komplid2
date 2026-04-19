'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/*
 * Собственный provider вместо next-themes — минимизирует зависимости.
 * Первичный класс `dark` и data-accent выставляются инлайн-скриптом в <head>
 * (см. layout.tsx) — это защищает от FOUC на SSR. Этот provider уже после
 * гидратации синхронизирует React-состояние с тем, что поставил скрипт.
 */

export type Theme = 'light' | 'dark';
export type Accent = 'steel' | 'cobalt' | 'lime';

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setAccent: (a: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'komplid-theme';
const ACCENT_KEY = 'komplid-accent';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function readInitialAccent(): Accent {
  if (typeof window === 'undefined') return 'steel';
  const attr = document.documentElement.getAttribute('data-accent');
  if (attr === 'cobalt' || attr === 'lime') return attr;
  return 'steel';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  const [accent, setAccentState] = useState<Accent>(readInitialAccent);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // localStorage может быть заблокирован — игнорируем
    }
    const el = document.documentElement;
    if (next === 'dark') el.classList.add('dark');
    else el.classList.remove('dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const setAccent = useCallback((next: Accent) => {
    setAccentState(next);
    try {
      localStorage.setItem(ACCENT_KEY, next);
    } catch {
      // игнорируем
    }
    const el = document.documentElement;
    if (next === 'steel') el.removeAttribute('data-accent');
    else el.setAttribute('data-accent', next);
  }, []);

  // Следим за системным prefers-color-scheme, если пользователь явно не выбрал тему
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored !== 'dark' && stored !== 'light') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, toggleTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
