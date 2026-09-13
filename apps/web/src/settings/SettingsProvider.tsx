import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CssBaseline,
  ThemeProvider as MuiThemeProvider,
  createTheme,
  useMediaQuery,
} from '@mui/material';

import { api } from '../api/client';
import type { Locale, ThemePreference } from '../api/types';
import i18n from '../i18n';

interface SettingsValue {
  locale: Locale;
  themePreference: ThemePreference;
  setLocale: (locale: Locale) => void;
  setThemePreference: (theme: ThemePreference) => void;
  hydrate: (locale?: string, theme?: ThemePreference) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [locale, setLocaleState] = useState<Locale>(
    (localStorage.getItem('musterwerk-locale') as Locale | null) ?? 'en',
  );
  const [themePreference, setThemeState] = useState<ThemePreference>(
    (localStorage.getItem('musterwerk-theme')?.toUpperCase() as ThemePreference | null) ?? 'SYSTEM',
  );

  const persist = (nextLocale: Locale, nextTheme: ThemePreference) => {
    void api('/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ locale: nextLocale, theme: nextTheme }),
    }).catch(() => undefined);
  };

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem('musterwerk-locale', next);
    void i18n.changeLanguage(next);
    persist(next, themePreference);
  };
  const setThemePreference = (next: ThemePreference) => {
    setThemeState(next);
    localStorage.setItem('musterwerk-theme', next.toLowerCase());
    persist(locale, next);
  };
  const hydrate = (nextLocale?: string, nextTheme?: ThemePreference) => {
    if (nextLocale && ['en', 'de-DE', 'zh-HK'].includes(nextLocale)) {
      const typedLocale = nextLocale as Locale;
      setLocaleState(typedLocale);
      localStorage.setItem('musterwerk-locale', typedLocale);
      void i18n.changeLanguage(typedLocale);
    }
    if (nextTheme) {
      setThemeState(nextTheme);
      localStorage.setItem('musterwerk-theme', nextTheme.toLowerCase());
    }
  };

  const mode =
    themePreference === 'SYSTEM' ? (systemDark ? 'dark' : 'light') : themePreference.toLowerCase();
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode as 'light' | 'dark',
          primary: { main: mode === 'dark' ? '#7cb5ff' : '#164e7a' },
          secondary: { main: '#df6f24' },
          background:
            mode === 'dark'
              ? { default: '#0b1220', paper: '#121c2d' }
              : { default: '#f3f6f8', paper: '#ffffff' },
          success: { main: '#2f7d5c' },
          warning: { main: '#b55a16' },
          error: { main: '#b53c3c' },
        },
        typography: {
          fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
          h1: {
            fontSize: 'clamp(2.15rem, 5vw, 4.8rem)',
            fontWeight: 750,
            letterSpacing: '-0.045em',
            lineHeight: 1.02,
          },
          h2: { fontSize: '1.8rem', fontWeight: 720, letterSpacing: '-0.025em' },
          h3: { fontSize: '1.15rem', fontWeight: 700 },
          body1: { fontSize: '1rem', lineHeight: 1.6 },
          button: { textTransform: 'none', fontWeight: 650 },
        },
        shape: { borderRadius: 10 },
        components: {
          MuiButton: { styleOverrides: { root: { minHeight: 42, borderRadius: 8 } } },
          MuiCard: {
            styleOverrides: {
              root: {
                border: `1px solid ${mode === 'dark' ? '#26344a' : '#dce3e8'}`,
                boxShadow: 'none',
              },
            },
          },
          MuiTableCell: { styleOverrides: { head: { fontWeight: 700, whiteSpace: 'nowrap' } } },
        },
      }),
    [mode],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.style.colorScheme = mode;
  }, [locale, mode]);

  return (
    <SettingsContext.Provider
      value={{ locale, themePreference, setLocale, setThemePreference, hydrate }}
    >
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('SettingsProvider is missing');
  return value;
};
