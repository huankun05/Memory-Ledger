import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { ThemeMode, ColorScheme } from '../types';
import { getColors, ColorPalette } from './colors';
import { getSetting, setSetting } from '../database/db';

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  isDark: boolean;
  colors: ColorPalette;
  isLoaded: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('warm');
  const [isLoaded, setIsLoaded] = useState(false);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = useMemo(() => {
    return getColors(colorScheme, isDark);
  }, [colorScheme, isDark]);

  useEffect(() => {
    let retries = 0;
    const maxRetries = 20;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadSettings = async () => {
      try {
        const [savedThemeMode, savedColorScheme] = await Promise.all([
          getSetting('themeMode'),
          getSetting('colorScheme'),
        ]);
        
        if (savedThemeMode && ['light', 'dark', 'system'].includes(savedThemeMode)) {
          setThemeModeState(savedThemeMode as ThemeMode);
        }
        
        if (savedColorScheme && ['warm', 'ocean', 'forest', 'rose', 'twilight'].includes(savedColorScheme)) {
          setColorSchemeState(savedColorScheme as ColorScheme);
        }
        
        setIsLoaded(true);
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          timer = setTimeout(loadSettings, 100);
        } else {
          console.error('Failed to load theme settings after retries:', error);
          setIsLoaded(true);
        }
      }
    };
    
    loadSettings();
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    setSetting('themeMode', mode).catch((error) => {
      console.error('Failed to save theme mode:', error);
    });
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    setSetting('colorScheme', scheme).catch((error) => {
      console.error('Failed to save color scheme:', error);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const newMode: ThemeMode = isDark ? 'light' : 'dark';
    setThemeModeState(newMode);
    setSetting('themeMode', newMode).catch((error) => {
      console.error('Failed to save theme mode:', error);
    });
  }, [isDark]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        colorScheme,
        isDark,
        colors,
        isLoaded,
        setThemeMode,
        setColorScheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// 自定义 Hook 获取主题上下文
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// 导出类型
export type { ThemeContextType };