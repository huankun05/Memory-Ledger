import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Settings } from '../types';

interface ThemeContextType {
  isDark: boolean;
  colorScheme: Settings['colorScheme'];
  colors: {
    primary: string;
    secondary: string;
    bg: string;
    card: string;
    text: string;
    muted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  toggleDark: () => void;
  setColorScheme: (scheme: Settings['colorScheme']) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const COLOR_SCHEMES: Record<Settings['colorScheme'], { primary: string; secondary: string }> = {
  warm: { primary: '#F59E0B', secondary: '#FBBF24' },
  ocean: { primary: '#3B82F6', secondary: '#60A5FA' },
  forest: { primary: '#10B981', secondary: '#34D399' },
  rose: { primary: '#EC4899', secondary: '#F472B6' },
  twilight: { primary: '#8B5CF6', secondary: '#A78BFA' },
};

export function ThemeProvider({ children, settings }: { children: React.ReactNode; settings: Settings }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let shouldBeDark = false;
    if (settings.themeMode === 'dark') {
      shouldBeDark = true;
    } else if (settings.themeMode === 'system') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setIsDark(shouldBeDark);
  }, [settings.themeMode]);

  const schemeColors = COLOR_SCHEMES[settings.colorScheme];
  const colors = {
    ...schemeColors,
    bg: isDark ? '#111827' : '#FAFAFA',
    card: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#111827',
    muted: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  };

  const toggleDark = () => {
    setIsDark(prev => !prev);
  };

  const setColorScheme = () => {};

  return (
    <ThemeContext.Provider value={{ isDark, colorScheme: settings.colorScheme, colors, toggleDark, setColorScheme }}>
      <div style={{ backgroundColor: colors.bg, minHeight: '100vh', color: colors.text }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
