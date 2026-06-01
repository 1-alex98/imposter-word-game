import type { ThemeDefinition } from 'vuetify';

export const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    'surface-bright': '#ffffff',
    'surface-variant': '#e0f2f1',
    'on-surface-variant': '#37474f',
    primary: '#009688',
    'primary-darken-1': '#00796b',
    secondary: '#ff6d00',
    'secondary-darken-1': '#e65100',
    tertiary: '#7c4dff',
    'tertiary-darken-1': '#651fff',
    error: '#b00020',
    info: '#2196f3',
    success: '#43a047',
    warning: '#ffb300',
  },
};

export const dark: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#1e1e1e',
    'surface-bright': '#2c2c2c',
    'surface-variant': '#26352f',
    'on-surface-variant': '#cfd8dc',
    primary: '#26a69a',
    'primary-darken-1': '#009688',
    secondary: '#ff9100',
    'secondary-darken-1': '#ff6d00',
    tertiary: '#b388ff',
    'tertiary-darken-1': '#7c4dff',
    error: '#cf6679',
    info: '#64b5f6',
    success: '#66bb6a',
    warning: '#ffc107',
  },
};

export function preferredThemeName(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
