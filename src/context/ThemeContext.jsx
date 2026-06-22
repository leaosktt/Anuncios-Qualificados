import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ThemeContext = createContext({});

const FONT_SIZES = { small: '14px', medium: '16px', large: '18px' };

const resolveTheme = (theme) => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState('light');
  const [accentColor, setAccentColorState] = useState('purple');
  const [fontSize, setFontSizeState] = useState('medium');

  // Aplica as preferências no documento inteiro sempre que mudarem
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolveTheme(theme));
    root.setAttribute('data-accent', accentColor);
    root.style.fontSize = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  }, [theme, accentColor, fontSize]);

  // Quando o tema é "Automático", segue a preferência do sistema operacional
  useEffect(() => {
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => document.documentElement.setAttribute('data-theme', resolveTheme('system'));
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  // Carrega as preferências salvas do usuário ao logar
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme, accent_color, font_size')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          if (data.theme) setThemeState(data.theme);
          if (data.accent_color) setAccentColorState(data.accent_color);
          if (data.font_size) setFontSizeState(data.font_size);
        }
      } catch (error) {
        console.error('Erro ao carregar preferências de aparência:', error);
      }
    };

    loadPreferences();
  }, [user]);

  const persist = async (patch) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, ...patch, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar preferências de aparência:', error);
    }
  };

  const setTheme = (value) => {
    setThemeState(value);
    persist({ theme: value });
  };

  const setAccentColor = (value) => {
    setAccentColorState(value);
    persist({ accent_color: value });
  };

  const setFontSize = (value) => {
    setFontSizeState(value);
    persist({ font_size: value });
  };

  return (
    <ThemeContext.Provider value={{ theme, accentColor, fontSize, setTheme, setAccentColor, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
