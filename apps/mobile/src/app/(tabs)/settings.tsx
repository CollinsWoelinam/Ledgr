import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Card, ListRow, Screen, Text } from '@/ui/components';
import { space, useColors } from '@/ui/theme';

// FR-6: control. Lock, backup and export arrive with their features.
export default function SettingsScreen() {
  const c = useColors();
  const { monthStartDay, setMonthStartDay, currency, dataSource } = useSettings();
  const resetSettings = useSettings((s) => s.reset);
  const { categories, reviewQueue, reset: resetLedger, loadDemo } = useLedger();

  // FR-6.3: delete all data in one action.
  const deleteAll = () =>
    Alert.alert('Delete all data?', 'This removes every transaction, budget, category and setting from this phone. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          resetLedger();
          resetSettings();
          router.replace('/welcome');
        },
      },
    ]);

  return (
    <Screen>
      <Section title="Budgets">
        <ListRow
          icon="calendar"
          title="Month starts on"
          detail="Set this to your payday"
          right={<Stepper value={monthStartDay} onChange={setMonthStartDay} />}
        />
        <ListRow icon="cash" title="Currency" detail={currency} />
      </Section>

      <Section title="Data">
        <ListRow icon="pricetags" title="Categories" detail={`${categories.length} categories`} onPress={() => router.push('/categories')} />
        <ListRow icon="alert-circle" title="Needs review" detail={`${reviewQueue.length} unrecognised messages`} onPress={() => router.push('/review')} />
        {dataSource === 'demo' && <ListRow icon="refresh" title="Reset demo data" detail="Restore the original sample transactions" onPress={loadDemo} />}
        <ListRow icon="download" title="Export CSV or PDF" detail="Coming in v1.1" disabled />
      </Section>

      <Section title="Security">
        <ListRow icon="finger-print" title="App lock" detail="Coming soon" disabled />
        <ListRow icon="cloud-upload" title="Encrypted backup" detail="Coming in v1.1" disabled />
      </Section>

      <Section title="Danger zone">
        <ListRow icon="trash" title="Delete all data" danger onPress={deleteAll} />
      </Section>

      <Text variant="caption" muted style={{ textAlign: 'center' }}>
        Ledgr 0.1.0 · Your SMS never leave this phone
      </Text>
    </Screen>
  );

  function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const btn = (label: string, next: number, a11y: string) => (
      <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={() => onChange(next)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="heading">{label}</Text>
      </Pressable>
    );
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {btn('−', value - 1, 'Earlier day')}
        <Text variant="label" style={{ minWidth: 24, textAlign: 'center' }}>
          {value}
        </Text>
        {btn('+', value + 1, 'Later day')}
      </View>
    );
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="caption" muted style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </Text>
      <Card style={{ paddingVertical: space.xs }}>{children}</Card>
    </View>
  );
}
