import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@simple_notes_theme';

const lightColors = {
  background: ['#F1F5F9', '#E2E8F0', '#F1F5F9'],
  surface: 'rgba(255, 255, 255, 0.95)',
  surfaceAlt: 'rgba(241, 245, 249, 0.9)',
  card: '#FFFFFF',
  border: 'rgba(148, 163, 184, 0.3)',
  borderAccent: 'rgba(99, 102, 241, 0.25)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryBg: 'rgba(99, 102, 241, 0.1)',
  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  dangerBg: 'rgba(239, 68, 68, 0.1)',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  inputBg: 'rgba(241, 245, 249, 0.8)',
  modalBg: '#FFFFFF',
  tabBar: '#FFFFFF',
  tabBorder: 'rgba(148, 163, 184, 0.2)',
  tabActive: '#6366F1',
  tabInactive: '#94A3B8',
  pickerText: '#0F172A',
  pickerBg: '#FFFFFF',
  shadow: '#94A3B8',
  overlay: 'rgba(0, 0, 0, 0.3)',
  filterRow: 'rgba(241, 245, 249, 0.9)',
  chipBg: 'rgba(16, 185, 129, 0.15)',
  chipText: '#059669',
  chipBorder: 'rgba(16, 185, 129, 0.3)',
};

const darkColors = {
  background: ['#0F172A', '#1E293B', '#0F172A'],
  surface: 'rgba(30, 41, 59, 0.9)',
  surfaceAlt: 'rgba(15, 23, 42, 0.6)',
  card: '#1E293B',
  border: 'rgba(51, 65, 85, 0.5)',
  borderAccent: 'rgba(99, 102, 241, 0.2)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryBg: 'rgba(99, 102, 241, 0.15)',
  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  dangerBg: 'rgba(248, 113, 113, 0.1)',
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.2)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.15)',
  inputBg: 'rgba(30, 41, 59, 0.8)',
  modalBg: '#1E293B',
  tabBar: '#1E293B',
  tabBorder: 'rgba(99, 102, 241, 0.2)',
  tabActive: '#818CF8',
  tabInactive: '#64748B',
  pickerText: '#F8FAFC',
  pickerBg: '#1E293B',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  filterRow: 'rgba(15, 23, 42, 0.6)',
  chipBg: 'rgba(52, 211, 153, 0.2)',
  chipText: '#34D399',
  chipBorder: 'rgba(52, 211, 153, 0.4)',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved !== null) setIsDark(saved === 'dark');
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
