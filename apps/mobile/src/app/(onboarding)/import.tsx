import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Button, ProgressBar, Text } from '@/ui/components';
import { space, useColors } from '@/ui/theme';

// FR-1.4: historical scan with progress, then a summary.
// TODO: when source is 'sms', run features/sms/historicalImport once the native module exists.
export default function ImportScreen() {
  const c = useColors();
  const { source } = useLocalSearchParams<{ source: 'demo' | 'sms' }>();
  const loadDemo = useLedger((s) => s.loadDemo);
  const total = useLedger((s) => s.transactions.length);
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadDemo();
    const timer = setInterval(() => setProgress((p) => Math.min(p + 0.04, 1)), 40);
    return () => clearInterval(timer);
  }, [loadDemo]);

  const done = progress >= 1;
  const found = Math.round(total * progress);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, padding: space.xl, justifyContent: 'center', gap: space.lg }}>
        <Ionicons name={done ? 'checkmark-circle' : 'search'} size={56} color={c.primary} />
        <Text variant="title">{done ? `We found ${total} transactions` : 'Reading your MoMo history…'}</Text>
        <ProgressBar ratio={progress} height={10} />
        <Text muted accessibilityLiveRegion="polite">
          {done ? 'Each one is categorised. You can correct any of them and Ledgr will learn.' : `${found} transactions found`}
        </Text>
        {source === 'sms' && (
          <Text variant="caption" muted>
            SMS import is not wired up yet, so this preview uses demo data.
          </Text>
        )}
      </View>
      <View style={{ padding: space.xl }}>
        <Button title="Go to dashboard" disabled={!done} onPress={() => completeOnboarding('demo')} />
      </View>
    </SafeAreaView>
  );
}
