import { View } from 'react-native';
import { formatDateTime } from '@/lib/format';
import { useLedger } from '@/state/ledger';
import { Button, Card, EmptyState, Screen, Text } from '@/ui/components';
import { space } from '@/ui/theme';

// FR-2.5: provider messages the parser didn't recognise. Raw text stays only until resolved.
export default function ReviewQueueScreen() {
  const { reviewQueue, dismissReview } = useLedger();

  if (reviewQueue.length === 0) {
    return <EmptyState icon="checkmark-done-circle-outline" title="All caught up" body="Every message from your wallets was recognised." />;
  }

  return (
    <Screen>
      <Text muted>These came from your wallet but didn't match a known format. Dismissing deletes the message text from Ledgr.</Text>
      {reviewQueue.map((item) => (
        <Card key={item.id} style={{ gap: space.md }}>
          <Text variant="caption" muted>
            {item.sender} · {formatDateTime(item.receivedAt)}
          </Text>
          <Text selectable>{item.body}</Text>
          {/* TODO: "Add manually", pre-filled from the message, once manual entry (US-09) exists. */}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Dismiss" kind="secondary" style={{ flex: 1 }} onPress={() => dismissReview(item.id)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
