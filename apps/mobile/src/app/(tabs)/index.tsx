import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { budgetProgress } from '@/features/budgets/progress';
import { latestBalance, summarize } from '@/features/insights/queries';
import { formatMoney } from '@/lib/format';
import { periodLabel, usePeriod } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { BudgetLine, Button, Card, CategoryIcon, EmptyState, Screen, Text, TransactionRow } from '@/ui/components';
import { space, useColors } from '@/ui/theme';

// FR-5.1: month at a glance.
export default function HomeScreen() {
  const c = useColors();
  const period = usePeriod();
  const currency = useSettings((s) => s.currency);
  const { transactions, budgets, categories, reviewQueue } = useLedger();

  const summary = useMemo(() => summarize(transactions, period), [transactions, period]);
  const balance = useMemo(() => latestBalance(transactions), [transactions]);
  const progress = useMemo(() => budgetProgress(budgets, transactions, period), [budgets, transactions, period]);
  const overall = progress.find((p) => p.categoryId === null);
  const watched = progress.filter((p) => p.categoryId !== null).sort((a, b) => b.ratio - a.ratio).slice(0, 3);
  const recent = transactions.slice(0, 5);

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <EmptyState icon="chatbubbles-outline" title="No transactions yet" body="New MoMo transactions will appear here within seconds of the SMS." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen>
        <View style={{ gap: space.xs }}>
          <Text variant="label" muted>
            {periodLabel(period)}
          </Text>
          <Text variant="caption" muted>
            Spent
          </Text>
          <Text variant="display" accessibilityLabel={`Spent ${formatMoney(summary.outMinor, currency)}`}>
            {formatMoney(summary.outMinor, currency)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Stat label="Money in" value={formatMoney(summary.inMinor, currency, { compact: true })} color={c.in} />
          <Stat label="Fees & tax" value={formatMoney(summary.feesMinor, currency)} />
          <Stat label="Balance" value={balance === undefined ? '—' : formatMoney(balance, currency, { compact: true })} />
        </View>

        {reviewQueue.length > 0 && (
          <Link href="/review" asChild>
            <Pressable>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, borderColor: c.warn }}>
                <Ionicons name="alert-circle" size={22} color={c.warn} />
                <Text style={{ flex: 1 }}>
                  {reviewQueue.length} message{reviewQueue.length > 1 ? 's' : ''} need{reviewQueue.length > 1 ? '' : 's'} review
                </Text>
                <Ionicons name="chevron-forward" size={18} color={c.muted} />
              </Card>
            </Pressable>
          </Link>
        )}

        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="heading">Budgets</Text>
            <Link href="/budgets" style={{ color: c.primary, fontWeight: '600' }}>
              See all
            </Link>
          </View>
          {overall ? (
            <BudgetLine label="Overall" spent={overall.spentMinor} limit={overall.limitMinor} ratio={overall.ratio} currency={currency} />
          ) : null}
          {watched.map((p) => {
            const category = categories.find((cat) => cat.id === p.categoryId);
            return (
              <View key={p.categoryId} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <CategoryIcon category={category} size={32} />
                <View style={{ flex: 1 }}>
                  <BudgetLine label={category?.name ?? ''} spent={p.spentMinor} limit={p.limitMinor} ratio={p.ratio} currency={currency} color={category?.color} />
                </View>
              </View>
            );
          })}
          {progress.length === 0 && <Button title="Set your first budget" kind="secondary" onPress={() => router.push('/budgets')} />}
        </Card>

        <Link href="/insights" asChild>
          <Pressable>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Ionicons name="pie-chart" size={22} color={c.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="label">Insights</Text>
                <Text variant="caption" muted>
                  Categories, daily spend and top recipients
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.muted} />
            </Card>
          </Pressable>
        </Link>

        <Card style={{ paddingVertical: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space.sm }}>
            <Text variant="heading">Recent</Text>
            <Link href="/transactions" style={{ color: c.primary, fontWeight: '600' }}>
              See all
            </Link>
          </View>
          {recent.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </Card>
      </Screen>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ flex: 1, padding: space.md, gap: 2 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="label" color={color} numberOfLines={1} adjustsFontSizeToFit style={{ fontWeight: '600' }}>
        {value}
      </Text>
    </Card>
  );
}
