import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { budgetProgress } from '@/features/budgets/progress';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { periodLabel, usePeriod } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { BudgetLine, Button, Card, CategoryIcon, Screen, Text } from '@/ui/components';
import { radius, space, useColors } from '@/ui/theme';

// FR-4.1: monthly budget per category plus an optional overall budget.
export default function BudgetsScreen() {
  const c = useColors();
  const period = usePeriod();
  const currency = useSettings((s) => s.currency);
  const { transactions, budgets, categories, setBudget } = useLedger();
  const [editing, setEditing] = useState<{ categoryId: string | null; name: string } | null>(null);

  const progress = useMemo(() => budgetProgress(budgets, transactions, period), [budgets, transactions, period]);
  const byCategory = new Map(progress.map((p) => [p.categoryId, p]));
  const overall = byCategory.get(null);
  const expense = categories.filter((cat) => cat.kind === 'expense');
  const withBudget = expense.filter((cat) => byCategory.has(cat.id));
  const without = expense.filter((cat) => !byCategory.has(cat.id));

  return (
    <>
      <Screen>
        <Text variant="label" muted>
          {periodLabel(period)}
        </Text>

        <Pressable onPress={() => setEditing({ categoryId: null, name: 'Overall' })} accessibilityRole="button" accessibilityHint="Edit overall budget">
          <Card style={{ gap: space.md }}>
            {overall ? (
              <>
                <BudgetLine label="Overall" spent={overall.spentMinor} limit={overall.limitMinor} ratio={overall.ratio} currency={currency} />
                <Text variant="caption" muted>
                  {formatMoney(overall.spentMinor, currency)} of {formatMoney(overall.limitMinor, currency)}
                </Text>
              </>
            ) : (
              <Text muted>No overall budget. Tap to set one.</Text>
            )}
          </Card>
        </Pressable>

        {withBudget.length > 0 && (
          <Card style={{ gap: space.lg }}>
            {withBudget.map((cat) => {
              const p = byCategory.get(cat.id)!;
              return (
                <Pressable key={cat.id} onPress={() => setEditing({ categoryId: cat.id, name: cat.name })} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                  <CategoryIcon category={cat} size={36} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <BudgetLine label={cat.name} spent={p.spentMinor} limit={p.limitMinor} ratio={p.ratio} currency={currency} color={cat.color} />
                    <Text variant="caption" muted>
                      {formatMoney(p.spentMinor, currency)} of {formatMoney(p.limitMinor, currency)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        )}

        {without.length > 0 && (
          <View style={{ gap: space.sm }}>
            <Text variant="heading">No budget yet</Text>
            <Card style={{ paddingVertical: space.xs }}>
              {without.map((cat) => (
                <Pressable key={cat.id} onPress={() => setEditing({ categoryId: cat.id, name: cat.name })} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
                  <CategoryIcon category={cat} size={32} />
                  <Text style={{ flex: 1 }}>{cat.name}</Text>
                  <Text variant="label" color={c.primary}>
                    Set
                  </Text>
                </Pressable>
              ))}
            </Card>
          </View>
        )}
      </Screen>

      {editing && (
        <BudgetSheet
          title={editing.name}
          currency={currency}
          initial={byCategory.get(editing.categoryId)?.limitMinor}
          onClose={() => setEditing(null)}
          onSave={(amount) => {
            setBudget(editing.categoryId, amount);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function BudgetSheet({ title, currency, initial, onSave, onClose }: { title: string; currency: string; initial?: number; onSave: (amount: number | null) => void; onClose: () => void }) {
  const c = useColors();
  const [text, setText] = useState(initial ? String(initial / 100) : '');
  const amount = parseMoneyInput(text);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#0008' }} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: c.card, padding: space.xl, gap: space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }}>
          <Text variant="title">{title} budget</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, borderBottomWidth: 2, borderColor: c.primary }}>
            <Text variant="title" muted>
              {currency}
            </Text>
            <TextInput
              autoFocus
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={c.muted}
              accessibilityLabel={`${title} monthly budget amount`}
              style={{ flex: 1, fontSize: 28, fontWeight: '700', color: c.text, paddingVertical: space.sm }}
            />
          </View>
          <Button title="Save" disabled={amount === undefined || amount <= 0} onPress={() => onSave(amount ?? null)} />
          {initial ? <Button title="Remove budget" kind="danger" onPress={() => onSave(null)} /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
