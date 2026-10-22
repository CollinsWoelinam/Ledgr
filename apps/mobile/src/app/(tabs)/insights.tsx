import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { periodContaining } from '@/features/budgets/period';
import { dailySpend, spendByCategory, summarize, topCounterparties } from '@/features/insights/queries';
import { formatAmount, formatMoney } from '@/lib/format';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Card, EmptyState, Screen, ScreenHeader, Text, titleCase } from '@/ui/components';
import { useColors } from '@/ui/theme';

const OFFSETS = [0, -1, -2];

// FR-5.2, FR-5.4: where the money went, daily rhythm, top recipients, fees.
export default function InsightsScreen() {
  const c = useColors();
  const [offset, setOffset] = useState(0);
  const { transactions, categories } = useLedger();
  const { currency, monthStartDay } = useSettings();
  const [now] = useState(Date.now); // fixed per visit so memoised periods stay stable
  const periods = useMemo(() => OFFSETS.map((o) => periodContaining(new Date(now), monthStartDay, o)), [monthStartDay, now]);
  const period = periods[OFFSETS.indexOf(offset)]!;

  const byCategory = useMemo(() => spendByCategory(transactions, period), [transactions, period]);
  const daily = useMemo(() => dailySpend(transactions, period), [transactions, period]);
  const top = useMemo(() => topCounterparties(transactions, period, 3), [transactions, period]);
  const summary = useMemo(() => summarize(transactions, period), [transactions, period]);

  const total = byCategory.reduce((s, x) => s + x.amountMinor, 0);
  const categoryOf = (id: string) => categories.find((cat) => cat.id === id);
  const daysSoFar = daily.filter((d) => d.day <= now).length || 1;
  const maxDay = Math.max(...daily.map((d) => d.amountMinor), 1);
  const todayKey = new Date(now).toDateString();
  const peak = daily.reduce((a, b) => (b.amountMinor > a.amountMinor ? b : a), daily[0]!);

  return (
    <Screen tab>
      <ScreenHeader
        title="Insights"
        right={
          <View accessibilityRole="radiogroup" accessibilityLabel="Month" style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 3 }}>
            {OFFSETS.map((o, i) => {
              const selected = o === offset;
              return (
                <Pressable
                  key={o}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setOffset(o)}
                  style={{ height: 32, paddingHorizontal: 12, borderRadius: 11, justifyContent: 'center', backgroundColor: selected ? c.surface : 'transparent' }}
                >
                  <Text variant="label" size={13} weight={selected ? 'semibold' : 'medium'} color={selected ? c.ink : c.muted}>
                    {new Date(periods[i]!.start).toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
      />

      {total === 0 ? (
        <EmptyState icon="pie-chart-outline" title="Nothing spent" body="No money went out in this month." />
      ) : (
        <>
          <Card style={{ borderRadius: 24, padding: 18, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text variant="label" size={14} muted>
                Where it went
              </Text>
              <Text numeric weight="bold" size={22}>
                {formatMoney(total, currency)}
              </Text>
            </View>
            <View
              accessibilityRole="image"
              accessibilityLabel={`Spending split: ${byCategory.map((x) => `${categoryOf(x.categoryId)?.name} ${Math.round((x.amountMinor / total) * 100)}%`).join(', ')}`}
              style={{ flexDirection: 'row', gap: 3, height: 18 }}
            >
              {byCategory.map((x, i) => (
                <View
                  key={x.categoryId}
                  style={{
                    flex: x.amountMinor,
                    backgroundColor: categoryOf(x.categoryId)?.color ?? c.muted,
                    borderTopLeftRadius: i === 0 ? 6 : 3,
                    borderBottomLeftRadius: i === 0 ? 6 : 3,
                    borderTopRightRadius: i === byCategory.length - 1 ? 6 : 3,
                    borderBottomRightRadius: i === byCategory.length - 1 ? 6 : 3,
                  }}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 10 }}>
              {byCategory.map((x) => {
                const cat = categoryOf(x.categoryId);
                return (
                  <View key={x.categoryId} style={{ width: '46%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat?.color ?? c.muted }} />
                    <Text size={13} style={{ flex: 1 }} numberOfLines={1}>
                      {cat?.name ?? 'Unknown'}
                    </Text>
                    <Text numeric weight="semibold" size={13}>
                      {formatAmount(x.amountMinor)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card tone="hero" style={{ borderRadius: 24, padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text variant="label" size={14} color={c.heroMuted}>
                Daily rhythm
              </Text>
              <Text size={13} color={c.heroMuted}>
                avg{' '}
                <Text numeric weight="semibold" size={13} color={c.heroText}>
                  {currency} {Math.round(summary.outMinor / daysSoFar / 100)}
                </Text>
                /day
              </Text>
            </View>
            <View
              accessibilityRole="image"
              accessibilityLabel={`Daily spending, highest on ${new Date(peak.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} at ${formatMoney(peak.amountMinor, currency)}`}
              style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 96 }}
            >
              {daily.map((d) => {
                const future = d.day > now;
                const isToday = new Date(d.day).toDateString() === todayKey;
                return (
                  <View
                    key={d.day}
                    style={{
                      flex: 1,
                      height: future || d.amountMinor === 0 ? 3 : `${Math.max((d.amountMinor / maxDay) * 100, 4)}%`,
                      borderRadius: 3,
                      backgroundColor: isToday ? c.accent : future ? c.heroTrack : d.amountMinor === 0 ? '#2A5547' : '#3E7A66',
                    }}
                  />
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" size={11} color={c.heroMuted}>
                {new Date(period.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </Text>
              {offset === 0 && (
                <Text variant="caption" size={11} color={c.heroMuted}>
                  Today
                </Text>
              )}
              <Text variant="caption" size={11} color={c.heroMuted}>
                {new Date(period.end - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </Card>

          <Card style={{ borderRadius: 24, paddingVertical: 8, paddingHorizontal: 18 }}>
            <Text variant="label" size={14} muted style={{ paddingTop: 10, paddingBottom: 4 }}>
              Top recipients
            </Text>
            {top.map((t, i) => (
              <View key={t.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: c.divider }}>
                <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 0 ? c.inverse : c.surfaceAlt }}>
                  <Text numeric weight="semibold" size={13} color={i === 0 ? c.onInverse : c.ink}>
                    {i + 1}
                  </Text>
                </View>
                <Text variant="label" size={14} style={{ flex: 1 }} numberOfLines={1}>
                  {titleCase(t.name)}
                  {t.count > 2 && (
                    <Text size={14} muted>
                      {' '}
                      · {t.count}×
                    </Text>
                  )}
                </Text>
                <Text numeric weight="semibold" size={14}>
                  {formatAmount(t.amountMinor)}
                </Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderColor: c.divider }}>
              <Text size={14} muted>
                Fees & e-levy paid
              </Text>
              <Text numeric weight="semibold" size={14}>
                {formatAmount(summary.feesMinor)}
              </Text>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
