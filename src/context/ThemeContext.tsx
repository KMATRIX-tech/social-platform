import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'wavelink_theme_light_v2';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    return saved || 'light'; // Default to clean Light Theme (#F8FAFC / #FFFFFF)
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let effectiveDark = false;

    if (theme === 'dark') {
      effectiveDark = true;
    } else if (theme === 'light') {
      effectiveDark = false;
    } else {
      effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDark(effectiveDark);

    if (effectiveDark) {
      root.classList.add('dark');
      body?.classList.add('dark');
      root.style.backgroundColor = '#0B0F19';
      root.style.colorScheme = 'dark';
      if (body) body.style.backgroundColor = '#0B0F19';
    } else {
      root.classList.remove('dark');
      body?.classList.remove('dark');
      root.style.backgroundColor = '#F8FAFC';
      root.style.colorScheme = 'light';
      if (body) {
        body.style.backgroundColor = '#F8FAFC';
        body.style.color = '#0F172A';
      }
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Listen for system changes if mode is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      const root = document.documentElement;
      const body = document.body;
      if (e.matches) {
        root.classList.add('dark');
        body?.classList.add('dark');
        root.style.backgroundColor = '#0B0F19';
        root.style.colorScheme = 'dark';
        if (body) body.style.backgroundColor = '#0B0F19';
      } else {
        root.classList.remove('dark');
        body?.classList.remove('dark');
        root.style.backgroundColor = '#F8FAFC';
        root.style.colorScheme = 'light';
        if (body) {
          body.style.backgroundColor = '#F8FAFC';
          body.style.color = '#0F172A';
        }
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
