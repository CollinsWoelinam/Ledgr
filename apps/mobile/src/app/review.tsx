import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReviewItem } from '@/db/schema';
import { walletName } from '@/features/cash/pocket';
import type { BalanceGap } from '@/features/reconcile/balanceGaps';
import { causeNoun, ratePercent, recordDefaults } from '@/features/reconcile/likelyCause';
import { reviewHint } from '@/features/sms/reviewHint';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useBalanceGaps } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { Button, Card, Chip, EmptyState, Screen, ScreenHeader, Text } from '@/ui/components';
import { fonts, useColors } from '@/ui/theme';

// Two kinds of things to review: balance changes no SMS explains (so every cedi is accounted for), and wallet
// messages Ledgr couldn't read (FR-2.5). Cards lead with what matters; an SMS stays collapsed until asked for.
export default function ReviewQueueScreen() {
  const { reviewQueue, dismissReview, clearReview, ignoreGap, recordGap } = useLedger();
  const gaps = useBalanceGaps();
  const [recording, setRecording] = useState<BalanceGap | null>(null);

  const clearAll = () =>
    Alert.alert(`Clear all ${reviewQueue.length}?`, 'Their message text will be deleted from Ledgr. Your SMS inbox is not touched.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: clearReview },
    ]);

  return (
    <Screen>
      <ScreenHeader title="Needs review" back right={reviewQueue.length > 1 ? <Button title={gaps.length ? 'Clear messages' : 'Clear all'} kind="dashed" small onPress={clearAll} /> : undefined} />
      {reviewQueue.length === 0 && gaps.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="All caught up" body="Every message was read and every balance adds up." />
      ) : null}

      {gaps.length > 0 && (
        <>
          <Text variant="overline" muted style={{ paddingHorizontal: 4 }}>
            Money that moved with no SMS
          </Text>
          {gaps.map((g) => (
            <GapCard key={g.key} gap={g} onRecord={() => setRecording(g)} onIgnore={() => ignoreGap(g.key)} />
          ))}
        </>
      )}

      {reviewQueue.length > 0 && (
        <>
          <Text variant="overline" muted style={{ paddingHorizontal: 4, marginTop: gaps.length ? 8 : 0 }}>
            Unread messages
          </Text>
          <Text muted>
            {reviewQueue.length === 1 ? 'Ledgr couldn’t read this message.' : `Ledgr couldn’t read these ${reviewQueue.length} messages.`}
          </Text>
          {reviewQueue.map((item) => (
            <ReviewCard key={item.id} item={item} onClear={() => dismissReview(item.id)} />
          ))}
        </>
      )}

      {recording && (
        <RecordGapSheet
          gap={recording}
          onClose={() => setRecording(null)}
          onSave={(name, categoryId) => {
            recordGap(recording, { ...recordDefaults(recording), name, categoryId });
            setRecording(null);
          }}
        />
      )}
    </Screen>
  );
}

// USSD codes where each wallet's statement shows the real recipient/sender for a period.
const STATEMENT_CODE: Record<string, string> = { mtn_momo: '*170#', telecel_cash: '*110#' };

// A balance change with no SMS. Shows the working, from balances the wallet itself reported, so it's clear the
// amount is exact and only the details (who, why) are unknown.
function GapCard({ gap, onRecord, onIgnore }: { gap: BalanceGap; onRecord: () => void; onIgnore: () => void }) {
  const c = useColors();
  const out = gap.amountMinor < 0;
  const wallet = walletName(gap.provider);
  const money = (minor: number, signed = false) => `${signed ? (minor < 0 ? '−' : '+') : ''}${formatMoney(Math.abs(minor), 'GHS')}`;
  const day = (at: number) => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const code = STATEMENT_CODE[gap.provider];
  const logins = gap.clues.filter((e) => e.kind === 'login');
  const airtime = out ? gap.clues.filter((e) => e.kind === 'airtime_topup') : []; // airtime can't explain money in

  const row = (label: string, value: string, strong = false) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text size={13} muted={!strong} weight={strong ? 'semibold' : 'regular'} style={{ flex: 1 }}>
        {label}
      </Text>
      <Text numeric size={13} weight={strong ? 'bold' : 'medium'} color={strong && !out ? c.positive : undefined}>
        {value}
      </Text>
    </View>
  );

  return (
    <Card style={{ borderRadius: 22, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Text variant="label" weight="semibold">
          No SMS for {money(gap.amountMinor)} {out ? 'that left' : 'that came into'} your {wallet}
        </Text>
        <Text variant="caption" muted>
          Worked out from the balances in your messages
        </Text>
      </View>

      <View style={{ backgroundColor: c.bg, borderRadius: 14, padding: 12, gap: 6 }} accessibilityLabel={`Balance ${money(gap.startBalanceMinor)} on ${formatDateTime(gap.from)}. Messages since explain ${money(gap.explainedMinor, true)}, so it should be ${money(gap.expectedMinor)}. ${wallet} reported ${money(gap.reportedMinor)} on ${formatDateTime(gap.to)}. Missing: ${money(gap.amountMinor, true)}.`}>
        {row(`Balance in SMS of ${formatDateTime(gap.from)}`, money(gap.startBalanceMinor))}
        {row('Explained by messages since', money(gap.explainedMinor, true))}
        {row('So the balance should be', money(gap.expectedMinor))}
        {row(`${wallet} reported on ${formatDateTime(gap.to)}`, money(gap.reportedMinor))}
        <View style={{ height: 1, backgroundColor: c.line, marginVertical: 2 }} />
        {row(out ? 'Left with no SMS' : 'Arrived with no SMS', money(gap.amountMinor, true), true)}
      </View>

      {/* Grey is the working, green is confirmed by a message, amber is a guess to check. */}
      {gap.likely?.kind === 'charged' ? (
        <View style={{ backgroundColor: c.warnSoft, borderRadius: 14, padding: 12, gap: 2 }}>
          <Text size={13} weight="semibold" color={c.warnInk}>
            Could be: a {causeNoun(gap.likely.type)} of {money(gap.likely.amountMinor)} + {money(gap.likely.chargesMinor)} charges
          </Text>
          <Text size={13} muted style={{ lineHeight: 19 }}>
            That’s the {ratePercent(gap.likely.chargesMinor, gap.likely.amountMinor)} {wallet} charged on your {causeNoun(gap.likely.type)}s at the time, like {money(gap.likely.example.amountMinor)} on {day(gap.likely.example.occurredAt)} (charges {money(gap.likely.example.feeMinor + gap.likely.example.taxMinor)}). A guess from the amount alone: check your statement to be sure.
          </Text>
        </View>
      ) : gap.likely ? (
        <View style={{ backgroundColor: c.okSoft, borderRadius: 14, padding: 12, gap: 2 }}>
          <Text size={13} weight="semibold" color={c.okInk}>
            Likely cause: airtime top-up of {money(gap.likely.amountMinor)}
          </Text>
          <Text size={13} muted style={{ lineHeight: 19 }}>
            MTN texted “Airtime recharged” on {formatDateTime(gap.likely.at)}, but MoMo sent no receipt for it.
          </Text>
        </View>
      ) : (
        <>
          {airtime.length > 0 && (
            <Text size={13} muted style={{ lineHeight: 19 }}>
              Airtime top-up{airtime.length > 1 ? 's' : ''} in this period: {airtime.map((e) => `${e.amountMinor ? money(e.amountMinor) : 'amount unknown'} on ${formatDateTime(e.at)}`).join(', ')}. {airtime.length > 1 ? 'They don’t' : 'It doesn’t'} add up to the full amount.
            </Text>
          )}
          {logins.length > 0 && (
            <Text size={13} muted style={{ lineHeight: 19 }}>
              You signed in to your wallet on {formatDateTime(logins[0]!.at)}{logins.length > 1 ? ` (and ${logins.length - 1} more time${logins.length > 2 ? 's' : ''})` : ''}. Transactions made in the app don’t always get an SMS.
            </Text>
          )}
        </>
      )}

      <Text size={13} muted style={{ lineHeight: 19 }}>
        To see {out ? 'who it went to' : 'who sent it'}, check your {wallet} statement{code ? ` (dial ${code})` : ''} for {day(gap.from)} to {day(gap.to)}.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button title="Record it…" small onPress={onRecord} />
        <Button title="Ignore" kind="dashed" small onPress={onIgnore} />
      </View>
    </Card>
  );
}

// Name and categorise the missing transaction before recording it.
function RecordGapSheet({ gap, onSave, onClose }: { gap: BalanceGap; onSave: (name: string, categoryId: string) => void; onClose: () => void }) {
  const c = useColors();
  const out = gap.amountMinor < 0;
  const categories = useLedger((s) => s.categories).filter((cat) => (out ? cat.kind === 'expense' : true));
  const defaults = recordDefaults(gap);
  const [name, setName] = useState(defaults.name);
  const [categoryId, setCategoryId] = useState(defaults.categoryId);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: '#0D171488' }} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <View style={{ padding: 24, gap: 16 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.chipBorder }} />
            <Text variant="title" size={24}>
              Record {formatMoney(Math.abs(gap.amountMinor), 'GHS')} {out ? 'spent' : 'received'}
            </Text>
            <View style={{ gap: 6 }}>
              <Text variant="label" size={14}>
                What was it?
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={out ? 'e.g. Rent paid in the MoMo app' : 'e.g. Refund from a friend'}
                placeholderTextColor={c.placeholder}
                accessibilityLabel="What was it?"
                style={{ height: 48, borderWidth: 1, borderColor: c.line, borderRadius: 16, paddingHorizontal: 14, color: c.ink, fontSize: 15, fontFamily: fonts.body.regular, backgroundColor: c.bg }}
              />
              <Text variant="caption" muted>
                Leave empty if you don’t know; it’s saved as “Missing SMS”.
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              <Text variant="label" size={14}>
                Category
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((cat) => (
                  <Chip key={cat.id} label={cat.name} dot={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
                ))}
              </View>
            </View>
            {defaults.feeMinor ? (
              <Text variant="caption" muted>
                Saved as {formatMoney(Math.abs(gap.amountMinor) - defaults.feeMinor, 'GHS')} plus {formatMoney(defaults.feeMinor, 'GHS')} in charges, so the charges show under Fees.
              </Text>
            ) : null}
            <Button title="Record" onPress={() => onSave(name, categoryId)} />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReviewCard({ item, onClear }: { item: ReviewItem; onClear: () => void }) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const hint = reviewHint(item.sender, item.body);

  return (
    <Card style={{ borderRadius: 22, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" weight="semibold">
            {hint.kind}
          </Text>
          <Text variant="caption" muted>
            {hint.wallet} · {formatDateTime(item.receivedAt)}
          </Text>
        </View>
        {hint.amount && (
          <Text numeric weight="semibold" size={16}>
            {hint.amount}
          </Text>
        )}
      </View>

      <Pressable accessibilityRole="button" accessibilityHint={expanded ? 'Shows less of the message' : 'Shows the full message'} onPress={() => setExpanded(!expanded)} style={{ backgroundColor: c.bg, borderRadius: 14, padding: 12, gap: 6 }}>
        <Text size={13} muted numberOfLines={expanded ? undefined : 3} style={{ lineHeight: 19 }} selectable={expanded}>
          {item.body}
        </Text>
        <Text variant="caption" weight="semibold" color={c.okInk}>
          {expanded ? 'Show less' : 'Show full message'}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button title="Add manually…" small onPress={() => router.push({ pathname: '/transaction/new', params: { review: item.id } })} />
        <Button title="Clear" kind="dashed" small onPress={onClear} />
      </View>
    </Card>
  );
}
