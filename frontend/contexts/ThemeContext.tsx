import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme definitions
export const themes = {
  dark: {
    name: 'Dark',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceLight: '#2A2A2A',
    primary: '#D4A574',
    text: '#FFFFFF',
    textSecondary: '#888888',
    textMuted: '#666666',
    border: '#333333',
    tabBar: '#1A1A1A',
    header: '#1A1A1A',
    cardBg: '#1E1E1E',
    error: '#E74C3C',
    success: '#27AE60',
    warning: '#F39C12',
    priorityHigh: '#E74C3C',
    priorityMedium: '#F39C12',
    priorityLow: '#27AE60',
  },
  light: {
    name: 'Light',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceLight: '#E8E8E8',
    primary: '#8B6914',
    text: '#1A1A1A',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#DDDDDD',
    tabBar: '#FFFFFF',
    header: '#FFFFFF',
    cardBg: '#FFFFFF',
    error: '#D32F2F',
    success: '#388E3C',
    warning: '#F57C00',
    priorityHigh: '#D32F2F',
    priorityMedium: '#F57C00',
    priorityLow: '#388E3C',
  },
  retro: {
    name: 'Retro',
    background: '#2C1810',
    surface: '#3D2317',
    surfaceLight: '#4E2E1E',
    primary: '#C9A227',
    text: '#F4E4BC',
    textSecondary: '#B8A07A',
    textMuted: '#8B7355',
    border: '#5A3D2B',
    tabBar: '#1E0F08',
    header: '#1E0F08',
    cardBg: '#3D2317',
    error: '#8B0000',
    success: '#228B22',
    warning: '#CD853F',
    priorityHigh: '#8B0000',
    priorityMedium: '#CD853F',
    priorityLow: '#228B22',
  },
  bright: {
    name: 'Bright',
    background: '#FFF8E7',
    surface: '#FFFFFF',
    surfaceLight: '#FFF0D4',
    primary: '#FF6B35',
    text: '#2D3436',
    textSecondary: '#636E72',
    textMuted: '#B2BEC3',
    border: '#FFE4C4',
    tabBar: '#FFFFFF',
    header: '#FF6B35',
    cardBg: '#FFFFFF',
    error: '#EB4D4B',
    success: '#6AB04C',
    warning: '#F9CA24',
    priorityHigh: '#EB4D4B',
    priorityMedium: '#F9CA24',
    priorityLow: '#6AB04C',
  },
};

export type ThemeName = keyof typeof themes;
export type Theme = typeof themes.dark;

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  appIcon: 'pink' | 'blue' | 'brown' | 'dark';
  setAppIcon: (icon: 'pink' | 'blue' | 'brown' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@vintage_camera_theme';
const ICON_STORAGE_KEY = '@vintage_camera_icon';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('dark');
  const [appIcon, setAppIconState] = useState<'pink' | 'blue' | 'brown' | 'dark'>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const savedIcon = await AsyncStorage.getItem(ICON_STORAGE_KEY);
        
        if (savedTheme && savedTheme in themes) {
          setThemeNameState(savedTheme as ThemeName);
        }
        if (savedIcon === 'pink' || savedIcon === 'blue' || savedIcon === 'brown' || savedIcon === 'dark') {
          setAppIconState(savedIcon);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadPreferences();
  }, []);

  const setThemeName = async (name: ThemeName) => {
    setThemeNameState(name);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setAppIcon = async (icon: 'pink' | 'blue' | 'brown' | 'dark') => {
    setAppIconState(icon);
    try {
      await AsyncStorage.setItem(ICON_STORAGE_KEY, icon);
    } catch (error) {
      console.error('Error saving icon:', error);
    }
  };

  const theme = themes[themeName];

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName, appIcon, setAppIcon }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
