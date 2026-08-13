import type { ThemeDefinition } from 'vuetify';

// Single source of truth for the app palette (PLAN 4.1).
// Material-Design-flavoured but deliberately vivid: this is a party game, so the
// palette leans on a violet primary, a teal secondary and a warm tertiary accent.
export const light: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#f4efff',
    surface: '#ffffff',
    'surface-bright': '#ffffff',
    'surface-variant': '#e9e0fb',
    'on-surface-variant': '#4a4458',
    primary: '#6c3fd1',
    'primary-darken-1': '#5730ad',
    secondary: '#00897b',
    'secondary-darken-1': '#00695f',
    tertiary: '#e85d2f',
    'tertiary-darken-1': '#c44a20',
    accent: '#ffb300',
    error: '#d32f2f',
    info: '#3b82f6',
    success: '#2bb673',
    warning: '#ffb300',
  },
};

export const dark: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#141019',
    surface: '#1d1826',
    'surface-bright': '#2b2436',
    'surface-variant': '#2b2436',
    'on-surface-variant': '#ded4ef',
    primary: '#b69cff',
    'primary-darken-1': '#9b7bff',
    secondary: '#4dd9c0',
    'secondary-darken-1': '#28c2a6',
    tertiary: '#ff9e7a',
    'tertiary-darken-1': '#ff7f52',
    accent: '#ffd166',
    error: '#ff6b6b',
    info: '#82b1ff',
    success: '#5ddba4',
    warning: '#ffd166',
  },
};

export function preferredThemeName(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
