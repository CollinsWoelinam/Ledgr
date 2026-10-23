import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { formatDateTime } from '@/lib/format';
import { useLedger } from '@/state/ledger';
import { Button, Card, EmptyState, Screen, ScreenHeader, Text } from '@/ui/components';
import { useColors } from '@/ui/theme';

// FR-2.5: provider messages the parser didn't recognise. Raw text stays only until resolved.
export default function ReviewQueueScreen() {
  const c = useColors();
  const { reviewQueue, dismissReview } = useLedger();

  return (
    <Screen>
      <ScreenHeader title="Needs review" back />
      {reviewQueue.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="All caught up" body="Every message from your wallets was recognised." />
      ) : (
        <>
          <Text muted style={{ lineHeight: 22 }}>
            These came from your wallet but didn’t match a format Ledgr knows yet. Dismissing deletes the message text from Ledgr.
          </Text>
          {reviewQueue.map((item) => (
            <Card key={item.id} style={{ borderRadius: 22, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={c.noticeInk} />
                <Text variant="caption" weight="semibold" color={c.noticeInk}>
                  {item.sender}
                </Text>
                <Text variant="caption" muted style={{ flex: 1, textAlign: 'right' }}>
                  {formatDateTime(item.receivedAt)}
                </Text>
              </View>
              <Text size={14} style={{ lineHeight: 21 }} selectable>
                {item.body}
              </Text>
              {/* TODO: "Add manually", pre-filled from the message, once manual entry (US-09) exists. */}
              <Button title="Dismiss" kind="dashed" small onPress={() => dismissReview(item.id)} style={{ alignSelf: 'flex-start' }} />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
