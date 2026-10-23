import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Category } from '@/db/schema';
import { dailyAllowance, daysLeft, elapsedRatio } from '@/features/budgets/pace';
import { budgetProgress, type BudgetProgress } from '@/features/budgets/progress';
import { latestBalance, summarize } from '@/features/insights/queries';
import { formatAmount, formatMoney } from '@/lib/format';
import { usePeriod } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Button, Card, CategoryIcon, EmptyState, IconButton, ProgressBar, Screen, Text, TransactionRow } from '@/ui/components';
import { useColors } from '@/ui/theme';

// FR-5.1: the month at a glance.
export default function HomeScreen() {
  const c = useColors();
  const period = usePeriod();
  const currency = useSettings((s) => s.currency);
  const { transactions, budgets, categories, reviewQueue } = useLedger();
  const [now] = useState(Date.now); // read once per mount; render must stay pure

  const summary = useMemo(() => summarize(transactions, period), [transactions, period]);
  const balance = useMemo(() => latestBalance(transactions), [transactions]);
  const progress = useMemo(() => budgetProgress(budgets, transactions, period), [budgets, transactions, period]);
  const overall = progress.find((p) => p.categoryId === null);
  const watched = progress.filter((p) => p.categoryId !== null).sort((a, b) => b.ratio - a.ratio).slice(0, 2);
  const today = transactions.filter((t) => new Date(t.occurredAt).toDateString() === new Date(now).toDateString());
  const recent = (today.length ? today : transactions).slice(0, 3);
  const days = daysLeft(period, now);
  const monthName = new Date(period.start).toLocaleDateString('en-GB', { month: 'long' });

  if (transactions.length === 0) {
    return (
      <Screen tab>
        <EmptyState icon="chatbubbles-outline" title="No transactions yet" body="New MoMo transactions appear here within seconds of the SMS." />
      </Screen>
    );
  }

  return (
    <Screen tab>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <View style={{ gap: 2 }}>
          <Text variant="caption" muted size={13}>
            {monthName} · {days} day{days === 1 ? '' : 's'} left
          </Text>
          <Text variant="heading" size={22} weight="bold" accessibilityRole="header">
            {greeting(new Date(now).getHours())}
          </Text>
        </View>
        <IconButton icon="notifications-outline" label={reviewCount(reviewQueue.length) ?? 'Nothing to review'} badge={reviewQueue.length > 0} onPress={() => router.push('/review')} />
      </View>

      <Card tone="hero" style={{ borderRadius: 28, padding: 22, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text variant="caption" size={13} color={c.heroMuted}>
            Spent this month
          </Text>
          <Text variant="display" size={42} color={c.heroText} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(summary.outMinor, currency)}
          </Text>
        </View>
        {overall ? (
          <View style={{ gap: 8 }}>
            <ProgressBar ratio={overall.ratio} height={10} color={overall.ratio >= 1 ? c.over : c.accent} trackColor={c.heroTrack} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text variant="caption" size={13} color={c.heroMuted}>
                <Text variant="caption" size={13} weight="semibold" color={c.heroText}>
                  {overall.spentMinor <= overall.limitMinor
                    ? `${formatMoney(overall.limitMinor - overall.spentMinor, currency)} left`
                    : `${formatMoney(overall.spentMinor - overall.limitMinor, currency)} over`}
                </Text>{' '}
                of {formatAmount(overall.limitMinor, { compact: true })}
              </Text>
              {overall.spentMinor < overall.limitMinor && (
                <Text variant="caption" size={13} color={c.heroMuted}>
                  ≈ {currency} {Math.floor(dailyAllowance(overall, period, now) / 100).toLocaleString('en-US')} a day
                </Text>
              )}
            </View>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push('/budgets')}>
            <Text variant="label" color={c.accent}>
              Set a monthly budget →
            </Text>
          </Pressable>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <HeroStat label="Money in" value={`+${formatAmount(summary.inMinor)}`} color={c.accent} />
          <HeroStat label="Fees & levy" value={formatAmount(summary.feesMinor)} />
          <HeroStat label="Balance" value={balance === undefined ? '—' : formatAmount(balance)} />
        </View>
      </Card>

      {reviewQueue.length > 0 && (
        <Card tone="notice" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingRight: 12, borderRadius: 20 }}>
          <Ionicons name="chatbox-ellipses-outline" size={20} color={c.noticeInk} />
          <Text style={{ flex: 1 }}>
            {reviewQueue.length} SMS we couldn’t read yet
          </Text>
          <Button title="Review" small onPress={() => router.push('/review')} />
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {watched.map((p) => (
          <BudgetTile key={p.categoryId} progress={p} category={categories.find((cat) => cat.id === p.categoryId)} elapsed={elapsedRatio(period, now)} />
        ))}
        {watched.length < 2 && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/budgets')} style={{ flex: 1, minHeight: 130, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: c.muted, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="add" size={22} color={c.ink} />
            <Text variant="label" size={13}>
              Add a category budget
            </Text>
          </Pressable>
        )}
      </View>

      <Card style={{ borderRadius: 24, paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 4 }}>
          <Text variant="heading">{today.length ? 'Today' : 'Recent'}</Text>
          <Pressable accessibilityRole="link" onPress={() => router.push('/transactions')} hitSlop={8}>
            <Text variant="label" size={13} weight="semibold" color={c.okInk}>
              See all
            </Text>
          </Pressable>
        </View>
        {recent.map((tx, i) => (
          <TransactionRow key={tx.id} tx={tx} divider={i > 0} />
        ))}
      </Card>
    </Screen>
  );
}

function HeroStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.heroAlt, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, gap: 2 }}>
      <Text variant="caption" color={c.heroMuted}>
        {label}
      </Text>
      <Text numeric weight="semibold" size={16} color={color ?? c.heroText} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function BudgetTile({ progress, category, elapsed }: { progress: BudgetProgress; category?: Category; elapsed: number }) {
  const c = useColors();
  const over = progress.ratio >= 1;
  const nearly = !over && progress.ratio >= 0.8;
  const left = progress.limitMinor - progress.spentMinor;
  const tone = over ? c.over : nearly ? c.warnInk : c.ink;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/budgets')} style={{ flex: 1 }}>
      <Card style={{ borderRadius: 22, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <CategoryIcon category={category} size={32} />
          <Text variant="caption" weight="semibold" color={over ? c.over : nearly ? c.warnInk : c.muted}>
            {Math.round(progress.ratio * 100)}%
          </Text>
        </View>
        <Text variant="caption" size={13} muted numberOfLines={1}>
          {category?.name}
        </Text>
        <Text numeric weight="semibold" size={18} color={tone} numberOfLines={1}>
          {over ? `${formatAmount(-left)} over` : `${formatAmount(left)} left`}
        </Text>
        <ProgressBar ratio={progress.ratio} height={6} color={over ? c.over : nearly ? c.warnBar : category?.color} trackColor={over ? c.overSoft : undefined} pace={elapsed} paceColor={c.muted} />
      </Card>
    </Pressable>
  );
}

function greeting(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function reviewCount(n: number): string | undefined {
  return n ? `${n} message${n > 1 ? 's' : ''} to review` : undefined;
}
