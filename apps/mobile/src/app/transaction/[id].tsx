import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';
import { counterpartyKey } from '@/features/categorization/categorize';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useCategory, useLedger } from '@/state/ledger';
import { Card, CategoryIcon, Chip, EmptyState, Screen, Text } from '@/ui/components';
import { space, useColors } from '@/ui/theme';

const TYPE_LABELS: Record<string, string> = {
  transfer_out: 'Sent',
  transfer_in: 'Received',
  payment: 'Payment',
  cash_out: 'Cash out',
  cash_in: 'Cash in',
  airtime_data: 'Airtime & data',
  reversal: 'Reversal',
};

// Inspect and correct one transaction (FR-3.3).
export default function TransactionDetailScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useLedger((s) => s.transactions.find((t) => t.id === id));
  const categories = useLedger((s) => s.categories);
  const setCategory = useLedger((s) => s.setCategory);
  const category = useCategory(tx?.categoryId);
  const key = tx && counterpartyKey(tx);
  const others = useLedger((s) => (key ? s.transactions.filter((t) => t.id !== id && counterpartyKey(t) === key).length : 0));

  if (!tx) return <EmptyState icon="help-circle" title="Transaction not found" body="It may have been deleted." />;

  const pick = (categoryId: string) => {
    if (categoryId === tx.categoryId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (!key) return setCategory(tx.id, categoryId, false);
    const name = categories.find((cat) => cat.id === categoryId)?.name;
    const scope = others > 0 ? `all ${others + 1} transactions with ${tx.counterpartyName}, and future ones` : `future transactions with ${tx.counterpartyName}`;
    Alert.alert(`Move to ${name}?`, `Apply this to ${scope}?`, [
      { text: 'Just this one', onPress: () => setCategory(tx.id, categoryId, false) },
      { text: 'Apply to all', onPress: () => setCategory(tx.id, categoryId, true) },
    ]);
  };

  const amount = tx.direction === 'in' ? tx.amountMinor : -tx.amountMinor;
  const rows: [string, string | undefined][] = [
    ['Date', formatDateTime(tx.occurredAt)],
    ['Fee', formatMoney(tx.feeMinor, tx.currency)],
    ['Tax / levy', formatMoney(tx.taxMinor, tx.currency)],
    ['Balance after', tx.balanceAfterMinor === undefined ? undefined : formatMoney(tx.balanceAfterMinor, tx.currency)],
    ['Number', tx.counterpartyNumber],
    ['Transaction ID', tx.externalRef],
    ['Reverses', tx.reversesRef],
    ['Source', tx.source === 'demo' ? 'Demo data' : tx.source === 'sms' ? 'SMS' : 'Manual'],
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: TYPE_LABELS[tx.type] }} />
      <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.md }}>
        <CategoryIcon category={category} size={56} />
        <Text variant="heading" style={{ textAlign: 'center' }}>
          {tx.counterpartyName ?? 'Unknown'}
        </Text>
        <Text variant="display" color={tx.direction === 'in' ? c.in : c.text}>
          {formatMoney(amount, tx.currency, { sign: true })}
        </Text>
      </View>

      <Card style={{ paddingVertical: space.xs }}>
        {rows
          .filter(([, v]) => v)
          .map(([label, value], i) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderColor: c.border }}>
              <Text muted>{label}</Text>
              <Text variant="label" selectable style={{ flexShrink: 1, textAlign: 'right' }}>
                {value}
              </Text>
            </View>
          ))}
      </Card>

      <View style={{ gap: space.sm }}>
        <Text variant="heading">Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {categories.map((cat) => (
            <Chip key={cat.id} label={cat.name} color={cat.color} selected={cat.id === tx.categoryId} onPress={() => pick(cat.id)} />
          ))}
        </View>
      </View>

      {tx.smsBody && (
        <View style={{ gap: space.sm }}>
          <Text variant="heading">Original SMS</Text>
          <Card>
            <Text selectable>{tx.smsBody}</Text>
          </Card>
          <Text variant="caption" muted>
            Stored only on this phone.
          </Text>
        </View>
      )}
    </Screen>
  );
}
