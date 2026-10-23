import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { bundledConfig } from '@ledgr/parser';
import type { ReviewItem } from '@/db/schema';
import type { BalanceGap } from '@/features/reconcile/balanceGaps';
import { reviewHint } from '@/features/sms/reviewHint';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useBalanceGaps } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { Button, Card, EmptyState, Screen, ScreenHeader, Text } from '@/ui/components';
import { useColors } from '@/ui/theme';

// Two kinds of things to review: balance changes no SMS explains (so every cedi is accounted for), and wallet
// messages Ledgr couldn't read (FR-2.5). Cards lead with what matters; an SMS stays collapsed until asked for.
export default function ReviewQueueScreen() {
  const { reviewQueue, dismissReview, clearReview, ignoreGap, recordGap } = useLedger();
  const gaps = useBalanceGaps();

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
            Unexplained balance changes
          </Text>
          {gaps.map((g) => (
            <GapCard key={g.key} gap={g} onRecord={() => recordGap(g)} onIgnore={() => ignoreGap(g.key)} />
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
    </Screen>
  );
}

function GapCard({ gap, onRecord, onIgnore }: { gap: BalanceGap; onRecord: () => void; onIgnore: () => void }) {
  const c = useColors();
  const out = gap.amountMinor < 0;
  const wallet = bundledConfig.providers.find((p) => p.id === gap.provider)?.name ?? gap.provider;
  const amount = formatMoney(Math.abs(gap.amountMinor), 'GHS');
  return (
    <Card style={{ borderRadius: 22, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" weight="semibold">
            {out ? 'Balance dropped' : 'Balance rose'} with no SMS
          </Text>
          <Text variant="caption" muted>
            {wallet}
          </Text>
        </View>
        <Text numeric weight="semibold" size={16} color={out ? c.ink : c.positive}>
          {out ? '−' : '+'}
          {amount}
        </Text>
      </View>
      <Text size={13} muted style={{ lineHeight: 19 }}>
        Between {formatDateTime(gap.from)} and {formatDateTime(gap.to)}, your {wallet} balance changed by {amount} more than your messages explain.
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button title={out ? 'Record as spending' : 'Record as money in'} small onPress={onRecord} />
        <Button title="Ignore" kind="dashed" small onPress={onIgnore} />
      </View>
    </Card>
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

      {/* TODO: "Add manually", pre-filled from the message, once manual entry (US-09) exists. */}
      <Button title="Clear" kind="dashed" small onPress={onClear} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}
