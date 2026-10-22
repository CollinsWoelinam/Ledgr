import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { periodContaining } from '@/features/budgets/period';
import { dailySpend, spendByCategory, summarize, topCounterparties } from '@/features/insights/queries';
import { formatMoney } from '@/lib/format';
import { periodLabel, usePeriod } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Bars } from '@/ui/charts/Bars';
import { Donut } from '@/ui/charts/Donut';
import { Card, Chip, Screen, Text } from '@/ui/components';
import { space, useColors } from '@/ui/theme';

const MONTHS_IN_TREND = 6;

// FR-5.2, FR-5.4: category donut, daily bars, monthly trend, top counterparties.
export default function InsightsScreen() {
  const c = useColors();
  const [offset, setOffset] = useState(0);
  const period = usePeriod(offset);
  const { transactions, categories } = useLedger();
  const { currency, monthStartDay } = useSettings();

  const byCategory = useMemo(() => spendByCategory(transactions, period), [transactions, period]);
  const daily = useMemo(() => dailySpend(transactions, period), [transactions, period]);
  const top = useMemo(() => topCounterparties(transactions, period), [transactions, period]);
  const summary = useMemo(() => summarize(transactions, period), [transactions, period]);
  const trend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: MONTHS_IN_TREND }, (_, i) => {
      const p = periodContaining(now, monthStartDay, i - MONTHS_IN_TREND + 1);
      return { start: p.start, out: summarize(transactions, p).outMinor };
    });
  }, [transactions, monthStartDay]);

  const total = byCategory.reduce((s, x) => s + x.amountMinor, 0);
  const categoryOf = (id: string) => categories.find((cat) => cat.id === id);
  const today = new Date().toDateString();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Chip label="This month" selected={offset === 0} onPress={() => setOffset(0)} />
        <Chip label="Last month" selected={offset === -1} onPress={() => setOffset(-1)} />
      </View>
      <Text variant="label" muted>
        {periodLabel(period)}
      </Text>

      <Card style={{ gap: space.lg }}>
        <Text variant="heading">Spending by category</Text>
        <View style={{ alignItems: 'center' }}>
          <Donut slices={byCategory.map((x) => ({ value: x.amountMinor, color: categoryOf(x.categoryId)?.color ?? c.muted }))}>
            <Text variant="caption" muted>
              Total
            </Text>
            <Text variant="heading">{formatMoney(total, currency, { compact: true })}</Text>
          </Donut>
        </View>
        <View style={{ gap: space.sm }}>
          {byCategory.map((x) => {
            const cat = categoryOf(x.categoryId);
            return (
              <View key={x.categoryId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat?.color ?? c.muted }} />
                <Text style={{ flex: 1 }}>{cat?.name ?? 'Unknown'}</Text>
                <Text variant="caption" muted style={{ width: 40, textAlign: 'right' }}>
                  {total ? Math.round((x.amountMinor / total) * 100) : 0}%
                </Text>
                <Text variant="label" style={{ minWidth: 96, textAlign: 'right' }}>
                  {formatMoney(x.amountMinor, currency)}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="heading">Daily spend</Text>
        <Bars
          bars={daily.map((d, i) => {
            const date = new Date(d.day);
            return {
              key: String(d.day),
              value: d.amountMinor,
              highlight: date.toDateString() === today,
              label: i === 0 || i === daily.length - 1 || date.getDate() % 7 === 1 ? String(date.getDate()) : undefined,
            };
          })}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="heading">Last {MONTHS_IN_TREND} months</Text>
        <Bars
          height={100}
          bars={trend.map((m, i) => ({
            key: String(m.start),
            value: m.out,
            highlight: i === MONTHS_IN_TREND - 1 + offset,
            label: new Date(m.start).toLocaleDateString('en-GB', { month: 'short' }),
          }))}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="heading">Top recipients</Text>
        {top.map((t, i) => (
          <View key={t.name} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Text variant="label" muted style={{ width: 18 }}>
              {i + 1}
            </Text>
            <View style={{ flex: 1 }}>
              <Text variant="label" numberOfLines={1}>
                {t.name}
              </Text>
              <Text variant="caption" muted>
                {t.count} transaction{t.count > 1 ? 's' : ''}
              </Text>
            </View>
            <Text variant="label">{formatMoney(t.amountMinor, currency)}</Text>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: space.md, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text muted>Fees & tax paid</Text>
          <Text variant="label">{formatMoney(summary.feesMinor, currency)}</Text>
        </View>
      </Card>
    </Screen>
  );
}
