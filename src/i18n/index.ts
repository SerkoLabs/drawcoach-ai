import { tr } from './tr';
import { trSettings } from './tr-settings';

const dictionary = { ...tr, ...trSettings } as const;

export const defaultLocale = 'tr' as const;
export type AppLocale = typeof defaultLocale;
export type TranslationKey = keyof typeof dictionary;

export function t(key: TranslationKey): string {
  return dictionary[key];
}

export function translateUnknown(key: string): string {
  if (key in dictionary) return dictionary[key as TranslationKey];
  if (__DEV__) console.warn(`[i18n] Missing Turkish translation: ${key}`);
  return `⟦${key}⟧`;
}

export function getAiLocaleContext() {
  return { locale: defaultLocale, languageName: 'Türkçe' } as const;
}
