import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {View} from 'react-native';
import { walletName } from '@/features/cash/pocket';
import { counterpartyKey } from '@/features/categorization/categorize';
import { formatAmount, formatMoney } from '@/lib/format';
import { highlight } from '@/lib/highlight';
import { useCategory, useLedger } from '@/state/ledger';
import { Button, Card, CategoryIcon, Chip, EmptyState, Screen, ScreenHeader, showDialog, Text, titleCase, Toggle } from '@/ui/components';
import { useColors } from '@/ui/theme';

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
  const setBusiness = useLedger((s) => s.setBusiness);
  const deleteTransaction = useLedger((s) => s.deleteTransaction);
  const category = useCategory(tx?.categoryId);
  const key = tx && counterpartyKey(tx);
  const others = useLedger((s) => (key ? s.transactions.filter((t) => t.id !== id && counterpartyKey(t) === key).length : 0));
  const [applyAll, setApplyAll] = useState(true);

  if (!tx) {
    return (
      <Screen>
        <ScreenHeader title="Transaction" back />
        <EmptyState icon="help-circle-outline" title="Transaction not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const provider = walletName(tx.provider);
  const manual = tx.source === 'manual';
  const name = titleCase(tx.counterpartyName ?? 'Unknown');
  const when = new Date(tx.occurredAt);
  const dateLine = [
    when.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    tx.counterpartyNumber?.replace(/^(\d{3})(\d{3})(\d+)$/, '$1 $2 $3'),
  ].filter(Boolean);
  const canApplyAll = !!key;

  const pick = (categoryId: string) => {
    if (categoryId !== tx.categoryId) setCategory(tx.id, categoryId, canApplyAll && applyAll);
  };

  return (
    <Screen>
      <ScreenHeader
        title={TYPE_LABELS[tx.type] ?? 'Transaction'}
        back
        right={
          provider ? (
            <View style={{ backgroundColor: c.okSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
              <Text variant="caption" weight="semibold" color={c.okInk}>
                {provider}
              </Text>
            </View>
          ) : undefined
        }
      />

      <View style={{ alignItems: 'center', gap: 6, paddingTop: 6, paddingBottom: 4 }}>
        <View style={{ marginBottom: 4 }}>
          <CategoryIcon category={category} size={60} />
        </View>
        <Text variant="label" size={17} weight="semibold" style={{ textAlign: 'center' }}>
          {name}
        </Text>
        <Text variant="display" size={44} color={tx.direction === 'in' ? c.positive : c.ink} adjustsFontSizeToFit numberOfLines={1}>
          {tx.direction === 'in' ? '+' : '−'}
          {formatMoney(tx.amountMinor, tx.currency)}
        </Text>
        <Text variant="caption" size={13} muted>
          {dateLine.join(' · ')}
        </Text>
      </View>

      {tx.smsBody && (
        <Card style={{ borderRadius: 22, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={16} color={c.okInk} />
            <Text variant="caption" weight="semibold" color={c.okInk}>
              Read from your SMS, on this phone
            </Text>
          </View>
          <Text size={13} style={{ lineHeight: 21 }} selectable>
            {highlight(tx.smsBody, [
              ...money(tx.amountMinor, tx.currency),
              [tx.counterpartyName, tx.counterpartyNumber].filter(Boolean).join(' '),
              tx.counterpartyName,
              ...(tx.balanceAfterMinor === undefined ? [] : money(tx.balanceAfterMinor, tx.currency)),
              tx.externalRef,
              ...money(tx.feeMinor, tx.currency),
              ...money(tx.taxMinor, tx.currency),
            ]).map((seg, i) =>
              seg.match ? (
                <Text key={i} size={13} weight="medium" style={{ backgroundColor: c.highlight }}>
                  {seg.text}
                </Text>
              ) : (
                seg.text
              ),
            )}
          </Text>
        </Card>
      )}

      {manual && (
        <Card style={{ borderRadius: 22, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="create-outline" size={16} color={c.muted} />
            <Text variant="caption" weight="semibold" muted>
              Added by you{tx.feeMinor ? ` · charges ${formatMoney(tx.feeMinor, tx.currency)}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Edit" small onPress={() => router.push({ pathname: '/transaction/new', params: { edit: tx.id } })} />
            <Button
              title="Delete"
              kind="dashed"
              small
              onPress={() =>
                showDialog('Delete this transaction?', 'It was added by you, so only Ledgr’s copy is removed.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => (deleteTransaction(tx.id), router.back()) },
                ])
              }
            />
          </View>
        </Card>
      )}

      {!manual && (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Tile label="Fee" value={formatAmount(tx.feeMinor)} />
        <Tile label="E-levy" value={formatAmount(tx.taxMinor)} />
        <Tile label="Balance after" value={tx.balanceAfterMinor === undefined ? '—' : formatAmount(tx.balanceAfterMinor)} />
      </View>
      )}
      {tx.externalRef && (
        <Text variant="caption" muted selectable style={{ textAlign: 'center' }}>
          Transaction ID {tx.externalRef}
          {tx.reversesRef ? ` · reverses ${tx.reversesRef}` : ''}
          {tx.source === 'demo' ? ' · demo data' : ''}
        </Text>
      )}

      <Card style={{ borderRadius: 22, gap: 14 }}>
        <Text variant="heading">Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((cat) => (
            <Chip key={cat.id} label={cat.name} dot={cat.color} selected={cat.id === tx.categoryId} onPress={() => pick(cat.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderColor: c.divider }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" size={14}>
              Business
            </Text>
            <Text variant="caption" muted>
              Keeps business money apart from personal
            </Text>
          </View>
          <Toggle value={!!tx.business} onChange={(on) => setBusiness(tx.id, on, canApplyAll && applyAll)} label="Business transaction" />
        </View>
        {canApplyAll && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderColor: c.divider }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" size={14}>
                Apply to all from {name}
              </Text>
              <Text variant="caption" muted>
                {others > 0 ? `${others} other transaction${others > 1 ? 's' : ''}, and future ones` : 'Future transactions too'}
              </Text>
            </View>
            <Toggle value={applyAll} onChange={setApplyAll} label={`Apply changes to all transactions from ${name}`} />
          </View>
        )}
      </Card>
    </Screen>
  );
}

// Providers write amounts both ways: "GHS 100.00" and "GHS100.00".
function money(minor: number, currency: string): string[] {
  const spaced = formatMoney(minor, currency);
  return [spaced, spaced.replace(' ', '')];
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, gap: 2 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text numeric weight="semibold" size={16} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}
