/**
 * Resolves the active color scheme and returns the matching palette plus the
 * skill-dimension hues. See https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, SkillColors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Scheme = 'light' | 'dark';

export function useScheme(): Scheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useTheme(): ThemeColors {
  return Colors[useScheme()] as ThemeColors;
}

export function useSkillColors() {
  return SkillColors[useScheme()];
}
