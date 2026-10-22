import { View } from 'react-native';
import { formatMoney } from '@/lib/format';
import { space, useColors } from '../theme';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';

export function BudgetLine({ label, spent, limit, ratio, currency, color }: { label: string; spent: number; limit: number; ratio: number; currency: string; color?: string }) {
  const c = useColors();
  const left = limit - spent;
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" color={left < 0 ? c.danger : c.muted}>
          {left >= 0 ? `${formatMoney(left, currency)} left` : `${formatMoney(-left, currency)} over`}
        </Text>
      </View>
      <ProgressBar ratio={ratio} color={color} budget />
    </View>
  );
}
