import Ionicons from '@expo/vector-icons/Ionicons';
import { bundledConfig } from '@ledgr/parser';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { ReviewItem, Transaction } from '@/db/schema';
import { CASH_WALLET, walletName } from '@/features/cash/pocket';
import { amountIn, reviewHint } from '@/features/sms/reviewHint';
import { formatAmount, parseMoneyInput } from '@/lib/format';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Button, Card, Chip, Screen, ScreenHeader, Text, Toggle } from '@/ui/components';
import { fonts, useColors } from '@/ui/theme';

const DAY = 86_400_000;
// Unread messages that are almost always money coming in.
const IN_KINDS = new Set(['Money in', 'Reversal', 'Bank withdrawal', 'Expired voucher', 'Token transfer']);

interface Draft {
  direction: 'in' | 'out';
  provider: string;
  amount: string;
  fee: string;
  name: string;
  categoryId: string;
  at: number;
  business: boolean;
}

// US-09: record a transaction yourself: cash, or a wallet movement that never got an SMS. Also edits one you made
// (`edit`), or turns an unread message into a transaction (`review`).
export default function ManualEntryScreen() {
  const c = useColors();
  const { edit, review } = useLocalSearchParams<{ edit?: string; review?: string }>();
  const { transactions, reviewQueue, categories, saveManual, dismissReview } = useLedger();
  const providers = useSettings((s) => s.providers);
  const editing = transactions.find((t) => t.id === edit && t.source === 'manual');
  const item = reviewQueue.find((r) => r.id === review);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(editing, item));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const out = draft.direction === 'out';
  const wallets = [CASH_WALLET.id, ...providers.filter((p) => p !== CASH_WALLET.id), ...(editing && !providers.includes(editing.provider) && editing.provider !== CASH_WALLET.id ? [editing.provider] : [])];
  // Spending your cash is never a cash withdrawal: that's where the cash came from.
  const choices = out ? categories.filter((cat) => cat.kind === 'expense' && !(draft.provider === CASH_WALLET.id && cat.id === 'cash')) : [...categories].sort((a, b) => (a.kind === 'income' ? -1 : 0) - (b.kind === 'income' ? -1 : 0));
  const amountMinor = parseMoneyInput(draft.amount);
  const feeMinor = draft.fee.trim() ? parseMoneyInput(draft.fee) : 0;
  const showFee = out && draft.provider !== CASH_WALLET.id;
  const ready = amountMinor !== undefined && amountMinor > 0 && feeMinor !== undefined;
  const [now] = useState(Date.now);
  const isToday = new Date(draft.at).toDateString() === new Date(now).toDateString();
  const dayLabel = isToday ? 'Today' : new Date(draft.at).toDateString() === new Date(now - DAY).toDateString() ? 'Yesterday' : new Date(draft.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: new Date(draft.at).getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });

  const switchDirection = (direction: 'in' | 'out') => set({ direction, categoryId: direction === 'out' ? (draft.categoryId === 'income' ? 'other' : draft.categoryId) : 'income' });
  const save = () => {
    if (!ready) return;
    saveManual({ provider: draft.provider, direction: draft.direction, business: draft.business, amountMinor: amountMinor!, feeMinor: showFee ? feeMinor! : 0, name: draft.name, categoryId: draft.categoryId, occurredAt: draft.at }, editing?.id);
    if (item) dismissReview(item.id);
    router.back();
  };

  const input = { height: 48, borderWidth: 1, borderColor: c.line, borderRadius: 16, paddingHorizontal: 14, color: c.ink, fontSize: 15, fontFamily: fonts.body.regular, backgroundColor: c.surface } as const;

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader title={editing ? 'Edit transaction' : 'Add transaction'} back />

      {item && (
        <Card style={{ borderRadius: 18, gap: 4 }}>
          <Text variant="caption" weight="semibold" muted>
            From the unread {reviewHint(item.sender, item.body).wallet} message
          </Text>
          <Text size={13} muted numberOfLines={3} style={{ lineHeight: 19 }}>
            {item.body}
          </Text>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Money out" selected={out} onPress={() => switchDirection('out')} />
        <Chip label="Money in" selected={!out} onPress={() => switchDirection('in')} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderColor: c.ink }}>
        <Text variant="title" size={26} muted>
          GHS
        </Text>
        <TextInput
          autoFocus={!editing && !item}
          value={draft.amount}
          onChangeText={(amount) => set({ amount })}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={c.placeholder}
          accessibilityLabel="Amount"
          style={{ flex: 1, fontSize: 30, fontFamily: fonts.display.bold, color: out ? c.ink : c.positive, paddingVertical: 8 }}
        />
      </View>

      <Field label="Wallet">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {wallets.map((w) => (
            <Chip key={w} label={walletName(w)} selected={draft.provider === w} onPress={() => set({ provider: w, ...(w === CASH_WALLET.id && draft.categoryId === 'cash' ? { categoryId: 'other' } : {}) })} />
          ))}
        </View>
        <Text variant="caption" muted style={{ lineHeight: 18 }}>
          {draft.provider === CASH_WALLET.id
            ? out
              ? 'Cash you spend moves out of Cash withdrawals into this category, so it isn’t counted twice.'
              : 'Cash you were given or paid.'
            : `Only for a ${walletName(draft.provider)} transaction that had no SMS. If its SMS arrives later, it replaces this entry.`}
        </Text>
      </Field>

      <Field label={out ? 'What was it?' : 'Who or what was it from?'}>
        <TextInput
          value={draft.name}
          onChangeText={(name) => set({ name })}
          placeholder={out ? 'e.g. Kenkey at the station' : 'e.g. Gift from Mum'}
          placeholderTextColor={c.placeholder}
          accessibilityLabel={out ? 'What was it?' : 'Who or what was it from?'}
          style={input}
        />
      </Field>

      {showFee && (
        <Field label="Charges (optional)">
          <TextInput value={draft.fee} onChangeText={(fee) => set({ fee })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={c.placeholder} accessibilityLabel="Charges" style={input} />
        </Field>
      )}

      <Field label="Category">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {choices.map((cat) => (
            <Chip key={cat.id} label={cat.name} dot={cat.color} selected={draft.categoryId === cat.id} onPress={() => set({ categoryId: cat.id })} />
          ))}
        </View>
      </Field>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" size={14}>
            Business
          </Text>
          <Text variant="caption" muted>
            Keeps business money apart from personal
          </Text>
        </View>
        <Toggle value={draft.business} onChange={(business) => set({ business })} label="Business transaction" />
      </View>

      <Field label="When">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <DayButton icon="chevron-back" label="Day before" onPress={() => set({ at: draft.at - DAY })} />
          <Text variant="label" style={{ flex: 1, textAlign: 'center' }}>
            {dayLabel}
          </Text>
          <DayButton icon="chevron-forward" label="Day after" disabled={draft.at + DAY > now} onPress={() => set({ at: draft.at + DAY })} />
        </View>
      </Field>

      <Button title={editing ? 'Save changes' : 'Add transaction'} disabled={!ready} onPress={save} />
      {ready && showFee && feeMinor! > 0 && (
        <Text variant="caption" muted style={{ textAlign: 'center' }}>
          GHS {formatAmount(amountMinor! + feeMinor!)} left the wallet in all
        </Text>
      )}
    </Screen>
  );
}

function initialDraft(editing: Transaction | undefined, item: ReviewItem | undefined): Draft {
  if (editing) {
    return {
      direction: editing.direction,
      provider: editing.provider,
      amount: (editing.amountMinor / 100).toFixed(2),
      fee: editing.feeMinor ? (editing.feeMinor / 100).toFixed(2) : '',
      name: editing.counterpartyName ?? '',
      categoryId: editing.categoryId,
      at: editing.occurredAt,
      business: !!editing.business,
    };
  }
  if (item) {
    const hint = reviewHint(item.sender, item.body);
    const direction = IN_KINDS.has(hint.kind) ? 'in' : 'out';
    const provider = bundledConfig.providers.find((p) => p.senderIds.some((id) => id.toLowerCase() === item.sender.toLowerCase()))?.id ?? CASH_WALLET.id;
    return { direction, provider, amount: amountIn(item.body)?.replace(/^GHS\s?/, '') ?? '', fee: '', name: hint.kind, categoryId: direction === 'in' ? 'income' : 'other', at: item.receivedAt, business: false };
  }
  return { direction: 'out', provider: CASH_WALLET.id, amount: '', fee: '', name: '', categoryId: 'food', at: Date.now(), business: false };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" size={14}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function DayButton({ icon, label, disabled, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; disabled?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={6} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
      <Ionicons name={icon} size={20} color={c.ink} />
    </Pressable>
  );
}
