import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import type { ReviewItem } from '@/db/schema';
import { reviewHint } from '@/features/sms/reviewHint';
import { formatDateTime } from '@/lib/format';
import { useLedger } from '@/state/ledger';
import { Button, Card, EmptyState, Screen, ScreenHeader, Text } from '@/ui/components';
import { useColors } from '@/ui/theme';

// FR-2.5: wallet messages Ledgr couldn't read. Each card leads with what matters (what, how much, when);
// the SMS itself stays collapsed until asked for. Clearing deletes the stored text.
export default function ReviewQueueScreen() {
  const { reviewQueue, dismissReview, clearReview } = useLedger();

  const clearAll = () =>
    Alert.alert(`Clear all ${reviewQueue.length}?`, 'Their message text will be deleted from Ledgr. Your SMS inbox is not touched.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: clearReview },
    ]);

  return (
    <Screen>
      <ScreenHeader title="Needs review" back right={reviewQueue.length > 1 ? <Button title="Clear all" kind="dashed" small onPress={clearAll} /> : undefined} />
      {reviewQueue.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="All caught up" body="Every message from your wallets was read." />
      ) : (
        <>
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
