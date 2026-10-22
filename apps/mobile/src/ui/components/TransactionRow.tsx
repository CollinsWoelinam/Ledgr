import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { Transaction } from '@/db/schema';
import { formatAmount, formatTime } from '@/lib/format';
import { useCategory } from '@/state/ledger';
import { useColors } from '../theme';
import { CategoryIcon } from './CategoryIcon';
import { Text } from './Text';

export function TransactionRow({ tx, divider }: { tx: Transaction; divider?: boolean }) {
  const c = useColors();
  const category = useCategory(tx.categoryId);
  const incoming = tx.direction === 'in';

  // Plain Pressable rather than <Link asChild>: asChild drops function styles, which collapses the row.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tx.counterpartyName ?? 'Transaction'}, ${incoming ? 'received' : 'spent'} ${formatAmount(tx.amountMinor)} ${tx.currency}, ${category?.name ?? ''}`}
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        borderTopWidth: divider ? 1 : 0,
        borderColor: c.divider,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <CategoryIcon category={category} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" numberOfLines={1}>
          {titleCase(tx.counterpartyName ?? 'Unknown')}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {category?.name} · {formatTime(tx.occurredAt)}
        </Text>
      </View>
      <Text numeric weight="semibold" size={15} color={incoming ? c.positive : c.ink}>
        {incoming ? '+' : '−'}
        {formatAmount(tx.amountMinor)}
      </Text>
    </Pressable>
  );
}

// SMS names arrive in capitals ("AUNTIE AKOS KITCHEN"); show them as names.
export function titleCase(name: string): string {
  return name.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bMtn\b/g, 'MTN').replace(/\bKfc\b/g, 'KFC').replace(/\bEcg\b/g, 'ECG').replace(/\bDstv\b/g, 'DStv');
}
