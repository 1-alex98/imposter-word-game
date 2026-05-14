import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import de from './locales/de.json';

export type Locale = 'en' | 'de';

const LOCALE_STORAGE_KEY = 'imposter:locale';

export function resolveDefaultLocale(navLang: string | undefined): Locale {
  if (!navLang) return 'en';
  const lower = navLang.toLowerCase();
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('en')) return 'en';
  return 'en';
}

function initialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = window.sessionStorage?.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
    return resolveDefaultLocale(window.navigator?.language);
  }
  return 'en';
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  missingWarn: import.meta.env?.DEV ?? false,
  fallbackWarn: false,
  silentTranslationWarn: !(import.meta.env?.DEV ?? false),
  messages: { en, de },
});

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale;
  if (typeof window !== 'undefined') {
    window.sessionStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  }
}
