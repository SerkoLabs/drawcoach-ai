import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface ProgressBarProps {
  /** 0-100 */
  percent: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({ percent, color, trackColor, height = 8 }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={[styles.track, { height, borderRadius: height, backgroundColor: trackColor ?? theme.backgroundAlt }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: color ?? theme.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
