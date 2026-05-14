import type { ThemeDefinition } from 'vuetify';

export const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    'surface-bright': '#ffffff',
    'surface-variant': '#f5f5f5',
    'on-surface-variant': '#424242',
    primary: '#1976d2',
    'primary-darken-1': '#1565c0',
    secondary: '#424242',
    'secondary-darken-1': '#212121',
    error: '#b00020',
    info: '#2196f3',
    success: '#4caf50',
    warning: '#fb8c00',
  },
};

export const dark: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#1e1e1e',
    'surface-bright': '#2c2c2c',
    'surface-variant': '#2c2c2c',
    'on-surface-variant': '#e0e0e0',
    primary: '#2196f3',
    'primary-darken-1': '#1976d2',
    secondary: '#b0bec5',
    'secondary-darken-1': '#90a4ae',
    error: '#cf6679',
    info: '#64b5f6',
    success: '#66bb6a',
    warning: '#ffa726',
  },
};

export function preferredThemeName(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
