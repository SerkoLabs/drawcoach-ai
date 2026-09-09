import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface OptionCardProps {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionCard({ label, hint, selected, onPress }: OptionCardProps) {
  const theme = useTheme();
  return (
    <Card
      onPress={onPress}
      style={{
        borderColor: selected ? theme.primary : theme.border,
        borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        backgroundColor: selected ? theme.primarySoft : theme.card,
      }}
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
          {hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text> : null}
        </View>
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? theme.primary : theme.borderStrong,
              backgroundColor: selected ? theme.primary : 'transparent',
            },
          ]}
        >
          {selected ? <Text style={[styles.check, { color: theme.onPrimary }]}>✓</Text> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  textCol: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 18 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { fontSize: 15, fontWeight: '900', lineHeight: 18 },
});
