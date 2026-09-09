import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface StepperProps {
  total: number;
  current: number; // 0-indexed
}

export function Stepper({ total, current }: StepperProps) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i <= current;
        return (
          <View
            key={i}
            style={[
              styles.seg,
              {
                backgroundColor: active ? theme.primary : theme.backgroundAlt,
                flex: i === current ? 1.4 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, width: '100%' },
  seg: { height: 6, borderRadius: 3 },
});
