import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Category } from '@/db/schema';
import { notificationsAllowed } from '@/features/budgets/notifications';
import { daysLeft, elapsedRatio, paceStatus, type PaceStatus } from '@/features/budgets/pace';
import { budgetProgress, type BudgetProgress } from '@/features/budgets/progress';
import { formatAmount, formatMoney, parseMoneyInput } from '@/lib/format';
import { usePeriod } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Button, Card, CategoryIcon, Chip, IconButton, ProgressBar, Screen, ScreenHeader, StatusPill, Text, type PillTone } from '@/ui/components';
import { fonts, useColors } from '@/ui/theme';

// What we're editing: a known budget, or `pick` to choose a category first.
type Editing = { categoryId: string | null } | 'pick' | null;

// FR-4.1: monthly budget per category plus an optional overall budget.
export default function BudgetsScreen() {
  const c = useColors();
  const period = usePeriod();
  const currency = useSettings((s) => s.currency);
  const { transactions, budgets, categories, setBudget } = useLedger();
  const [editing, setEditing] = useState<Editing>(null);
  const [now] = useState(Date.now);

  const progress = useMemo(() => budgetProgress(budgets, transactions, period), [budgets, transactions, period]);
  const byCategory = new Map(progress.map((p) => [p.categoryId, p]));
  const overall = byCategory.get(null);
  const elapsed = elapsedRatio(period, now);
  const expense = categories.filter((cat) => cat.kind === 'expense');
  const budgeted = expense.filter((cat) => byCategory.has(cat.id)).sort((a, b) => byCategory.get(b.id)!.ratio - byCategory.get(a.id)!.ratio);
  const unbudgeted = expense.filter((cat) => !byCategory.has(cat.id));
  const resets = new Date(period.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const monthName = new Date(period.start).toLocaleDateString('en-GB', { month: 'long' });

  return (
    <>
      <Screen tab>
        <ScreenHeader title="Budgets" right={<IconButton icon="add" label="New budget" filled onPress={() => setEditing('pick')} />} />

        <Pressable accessibilityRole="button" accessibilityHint="Edit the overall budget" onPress={() => setEditing({ categoryId: null })}>
          <Card tone="hero" style={{ borderRadius: 28, padding: 20, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text size={13} color={c.heroMuted}>
                Overall · {monthName}
              </Text>
              <Text size={13} color={c.heroMuted}>
                Resets {resets}
              </Text>
            </View>
            {overall ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <Text variant="display" size={38} color={overall.ratio >= 1 ? c.over : c.heroText}>
                    {formatMoney(Math.abs(overall.limitMinor - overall.spentMinor), currency)}
                  </Text>
                  <Text size={14} color={c.heroMuted}>
                    {overall.ratio >= 1 ? 'over' : 'left'} of {formatAmount(overall.limitMinor, { compact: true })}
                  </Text>
                </View>
                <ProgressBar ratio={overall.ratio} height={12} color={overall.ratio >= 1 ? c.over : c.accent} trackColor={c.heroTrack} pace={elapsed} paceColor={c.heroText} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 2, height: 12, borderRadius: 1, backgroundColor: c.heroText }} />
                  <Text size={13} color="#D4E3DC" style={{ flex: 1 }}>
                    {Math.round(overall.ratio * 100)}% spent with {Math.round(elapsed * 100)}% of the month gone: {paceSentence(paceStatus(overall, elapsed), daysLeft(period, now))}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ gap: 6 }}>
                <Text variant="heading" size={22} color={c.heroText}>
                  No overall budget yet
                </Text>
                <Text size={14} color={c.accent}>
                  Tap to set a monthly limit →
                </Text>
              </View>
            )}
          </Card>
        </Pressable>

        {budgeted.length > 0 && (
          <Card style={{ borderRadius: 24, paddingVertical: 4 }}>
            {budgeted.map((cat, i) => (
              <BudgetRow key={cat.id} category={cat} progress={byCategory.get(cat.id)!} elapsed={elapsed} divider={i > 0} onPress={() => setEditing({ categoryId: cat.id })} />
            ))}
          </Card>
        )}

        {unbudgeted.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text variant="label" size={14} muted>
              Not budgeted yet
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {unbudgeted.map((cat) => (
                <Button key={cat.id} kind="dashed" small title={cat.name} icon={<Ionicons name="add" size={16} color={c.ink} />} onPress={() => setEditing({ categoryId: cat.id })} />
              ))}
            </View>
          </View>
        )}
      </Screen>

      {editing && (
        <BudgetSheet
          editing={editing}
          categories={unbudgeted}
          currency={currency}
          initial={editing !== 'pick' ? byCategory.get(editing.categoryId)?.limitMinor : undefined}
          title={editing === 'pick' ? 'New budget' : editing.categoryId === null ? 'Overall budget' : `${categories.find((cat) => cat.id === editing.categoryId)?.name} budget`}
          onClose={() => setEditing(null)}
          onSave={(categoryId, amount) => {
            setBudget(categoryId, amount);
            setEditing(null);
            // The first budget is when alerts become useful, so that's when to ask (once; Settings can ask again).
            if (amount && budgets.length === 0 && useSettings.getState().budgetAlerts) void notificationsAllowed(true);
          }}
        />
      )}
    </>
  );
}

const PILLS: Record<PaceStatus, PillTone> = { over: 'over', nearly: 'warn', ahead: 'warn', onPace: 'ok' };

function BudgetRow({ category, progress, elapsed, divider, onPress }: { category: Category; progress: BudgetProgress; elapsed: number; divider: boolean; onPress: () => void }) {
  const c = useColors();
  const status = paceStatus(progress, elapsed);
  const left = progress.limitMinor - progress.spentMinor;
  const pill = status === 'over' ? `${formatAmount(-left, { compact: true })} over` : status === 'nearly' ? `${formatAmount(left, { compact: true })} left` : status === 'ahead' ? 'Ahead of pace' : 'On pace';
  const bar = status === 'over' ? c.over : status === 'nearly' ? c.warnBar : category.color;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name}: ${formatAmount(progress.spentMinor)} of ${formatAmount(progress.limitMinor)}, ${pill}`}
      onPress={onPress}
      style={({ pressed }) => ({ gap: 8, paddingVertical: 14, borderTopWidth: divider ? 1 : 0, borderColor: c.divider, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CategoryIcon category={category} size={36} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="label">{category.name}</Text>
          <Text variant="caption" numeric muted>
            {formatAmount(progress.spentMinor)} of {formatAmount(progress.limitMinor)}
          </Text>
        </View>
        <StatusPill label={pill} tone={PILLS[status]} />
      </View>
      <ProgressBar ratio={progress.ratio} color={bar} trackColor={status === 'over' ? c.overSoft : undefined} pace={elapsed} />
    </Pressable>
  );
}

function paceSentence(status: PaceStatus, days: number): string {
  if (status === 'over') return 'over budget.';
  if (status === 'nearly') return `nearly at the limit with ${days} days to go.`;
  if (status === 'ahead') return 'slightly ahead of pace.';
  return 'on pace.';
}

function BudgetSheet({ editing, categories, title, currency, initial, onSave, onClose }: {
  editing: Exclude<Editing, null>;
  categories: Category[];
  title: string;
  currency: string;
  initial?: number;
  onSave: (categoryId: string | null, amount: number | null) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const [text, setText] = useState(initial ? String(initial / 100) : '');
  const [picked, setPicked] = useState<string | null | undefined>(editing === 'pick' ? categories[0]?.id : editing.categoryId);
  const amount = parseMoneyInput(text);
  const ready = picked !== undefined && amount !== undefined && amount > 0;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: '#0D171488' }} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <View style={{ padding: 24, gap: 18 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.chipBorder }} />
            <Text variant="title" size={26}>
              {title}
            </Text>
            {editing === 'pick' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((cat) => (
                  <Chip key={cat.id} label={cat.name} dot={cat.color} selected={picked === cat.id} onPress={() => setPicked(cat.id)} />
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderColor: c.ink }}>
              <Text variant="title" size={26} muted>
                {currency}
              </Text>
              <TextInput
                autoFocus={editing !== 'pick'}
                value={text}
                onChangeText={setText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={c.placeholder}
                accessibilityLabel={`${title}, monthly amount`}
                style={{ flex: 1, fontSize: 30, fontFamily: fonts.display.bold, color: c.ink, paddingVertical: 8 }}
              />
            </View>
            <Button title="Save budget" disabled={!ready} onPress={() => ready && onSave(picked, amount)} />
            {initial ? <Button title="Remove budget" kind="danger" onPress={() => onSave(picked ?? null, null)} /> : null}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
