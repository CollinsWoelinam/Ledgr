import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { Transaction } from '@/db/schema';
import { formatMoney, formatTime } from '@/lib/format';
import { useCategory } from '@/state/ledger';
import { space, useColors } from '../theme';
import { CategoryIcon } from './CategoryIcon';
import { Text } from './Text';

export function TransactionRow({ tx }: { tx: Transaction }) {
  const c = useColors();
  const category = useCategory(tx.categoryId);
  const amount = tx.direction === 'in' ? tx.amountMinor : -tx.amountMinor;

  // Plain Pressable rather than <Link asChild>: asChild drops function styles, which collapses the row.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tx.counterpartyName ?? 'Transaction'}, ${formatMoney(amount, tx.currency)}, ${category?.name ?? ''}`}
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: pressed ? 0.6 : 1 })}
    >
      <CategoryIcon category={category} />
      <View style={{ flex: 1 }}>
        <Text variant="label" numberOfLines={1}>
          {tx.counterpartyName ?? 'Unknown'}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {category?.name} · {formatTime(tx.occurredAt)}
        </Text>
      </View>
      <Text variant="label" color={tx.direction === 'in' ? c.in : c.text} style={{ fontWeight: '600' }}>
        {formatMoney(amount, tx.currency, { sign: true })}
      </Text>
    </Pressable>
  );
}
