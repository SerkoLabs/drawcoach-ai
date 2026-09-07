import { tr } from './tr';

export const defaultLocale = 'tr' as const;
export type AppLocale = typeof defaultLocale;
export type TranslationKey = keyof typeof tr;

export function t(key: TranslationKey): string {
  return tr[key];
}

export function translateUnknown(key: string): string {
  if (key in tr) return tr[key as TranslationKey];
  if (__DEV__) console.warn(`[i18n] Missing Turkish translation: ${key}`);
  return `⟦${key}⟧`;
}

export function getAiLocaleContext() {
  return { locale: defaultLocale, languageName: 'Türkçe' } as const;
}
