import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { smsAvailable, syncInbox } from '@/features/sms/sync';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Button, Text } from '@/ui/components';
import { useColors } from '@/ui/theme';

const BG = '#0B221C';
const RING = 210;
const STROKE = 14;
const R = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

// FR-1.4: historical scan with progress, then a summary. Real SMS when the native module is built in,
// otherwise (Expo Go, or the user chose demo) seeded demo data.
export default function ImportScreen() {
  const c = useColors();
  const { source } = useLocalSearchParams<{ source: 'demo' | 'sms' }>();
  const loadDemo = useLedger((s) => s.loadDemo);
  const transactions = useLedger((s) => s.transactions);
  const reviewCount = useLedger((s) => s.reviewQueue.length);
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const realSms = source === 'sms' && smsAvailable();

  useEffect(() => {
    if (realSms) {
      syncInbox((read, total) => setProgress(total ? read / total : 1))
        .then(() => setProgress(1))
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
      return;
    }
    loadDemo();
    const timer = setInterval(() => setProgress((p) => Math.min(p + 0.03, 1)), 40);
    return () => clearInterval(timer);
  }, [realSms, loadDemo]);

  const done = progress >= 1 || !!error;
  const total = transactions.length;
  const since = useMemo(() => {
    const oldest = transactions.reduce((min, t) => Math.min(min, t.occurredAt), Date.now());
    const first = new Date(oldest);
    const months = (new Date().getFullYear() - first.getFullYear()) * 12 + new Date().getMonth() - first.getMonth() + 1;
    return { month: first.toLocaleDateString('en-GB', { month: 'long' }), months };
  }, [transactions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 24 }}>
        <View accessibilityLabel="Step 2 of 2" style={{ flexDirection: 'row', gap: 6, height: 44, alignItems: 'center' }}>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.accent }} />
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: done ? c.accent : c.heroTrack }} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={RING} height={RING} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="#1A3A31" strokeWidth={STROKE} fill="none" />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke={c.accent}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              />
            </Svg>
            <View style={{ alignItems: 'center', gap: 2 }} accessibilityLiveRegion="polite">
              <Text variant="display" size={64} color={c.heroText} style={{ lineHeight: 66 }}>
                {Math.round(total * progress)}
              </Text>
              <Text size={14} color="#B9CDC5">
                {done ? 'transactions found' : 'reading your history…'}
              </Text>
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', gap: 8, opacity: done ? 1 : 0.4 }}>
            <Stat icon="calendar-outline" label={`History since ${since.month}`} value={`${since.months} month${since.months === 1 ? '' : 's'}`} />
            <Stat icon="pricetag-outline" label="Sorted into categories" value={`All ${total}`} />
            <Stat icon="chatbox-ellipses-outline" label="Messages to review" value={String(reviewCount)} iconColor="#F6B26B" />
          </View>

          <Text size={14} color="#B9CDC5" style={{ textAlign: 'center', lineHeight: 21 }}>
            {error
              ? `Couldn’t read your SMS: ${error}`
              : source === 'sms' && !realSms
                ? 'Reading SMS needs the installed app, so this preview uses demo data.'
                : 'Fix any category once and Ledgr remembers it for that person or shop.'}
          </Text>
        </View>

        <Button
          title="Open my dashboard"
          kind="accent"
          disabled={!done}
          onPress={() => completeOnboarding(realSms ? 'sms' : 'demo')}
        />
      </View>
    </SafeAreaView>
  );

  function Stat({ icon, label, value, iconColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; iconColor?: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.heroAlt, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 }}>
        <Ionicons name={icon} size={20} color={iconColor ?? c.accent} />
        <Text size={15} color={c.heroText} style={{ flex: 1 }}>
          {label}
        </Text>
        <Text numeric weight="semibold" size={15} color={c.heroText}>
          {value}
        </Text>
      </View>
    );
  }
}
