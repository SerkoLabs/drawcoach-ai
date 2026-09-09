/**
 * DrawCoach AI design system.
 *
 * A calm, studio-inspired palette: warm paper light mode, deep charcoal dark
 * mode, with an indigo primary and a graphite accent. Skill dimensions each
 * get a stable hue so progress reads consistently across the app.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17151F',
    textSecondary: '#5B5766',
    textMuted: '#8A8594',
    background: '#FBF9F5', // warm paper
    backgroundAlt: '#F3F0EA',
    card: '#FFFFFF',
    cardAlt: '#F6F4EF',
    border: '#E7E2D8',
    borderStrong: '#D8D2C6',
    primary: '#4C4CE6',
    primarySoft: '#EAEAFB',
    onPrimary: '#FFFFFF',
    success: '#1F9D6B',
    successSoft: '#E1F4EC',
    warning: '#C8811E',
    warningSoft: '#FBEFDA',
    danger: '#D6453D',
    dangerSoft: '#FBE6E4',
    star: '#E0A72E',
    overlay: 'rgba(23,21,31,0.45)',
  },
  dark: {
    text: '#F4F2F7',
    textSecondary: '#B4AFBE',
    textMuted: '#807B89',
    background: '#121016',
    backgroundAlt: '#1A171F',
    card: '#1E1B24',
    cardAlt: '#26222D',
    border: '#312D3A',
    borderStrong: '#3D3846',
    primary: '#8E8EF6',
    primarySoft: '#26244A',
    onPrimary: '#12101A',
    success: '#5BD6A0',
    successSoft: '#173A2C',
    warning: '#E6B45B',
    warningSoft: '#3A2E17',
    danger: '#F0736B',
    dangerSoft: '#3A1E1D',
    star: '#F0C65B',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

// String-valued so the light and dark palettes (which have narrow, differing
// literal types) are both assignable to one shared shape.
export type ThemeColors = { readonly [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

/** Stable hue per skill dimension, tuned for light and dark legibility. */
export const SkillColors = {
  light: {
    composition: '#4C4CE6',
    perspective: '#1F9D6B',
    value: '#8A5AD6',
    color: '#D6453D',
    medium: '#C8811E',
  },
  dark: {
    composition: '#8E8EF6',
    perspective: '#5BD6A0',
    value: '#B490EC',
    color: '#F0736B',
    medium: '#E6B45B',
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const MaxContentWidth = 720;
