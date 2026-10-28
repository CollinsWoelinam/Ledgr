import Ionicons from '@expo/vector-icons/Ionicons';
import { bundledConfig } from '@ledgr/parser';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { notificationsAllowed } from '@/features/notifications/notifications';
import { phoneHasScreenLock } from '@/features/security/appLock';
import { LOCK_AFTER_OPTIONS } from '@/features/security/lockPolicy';
import { confirmWithLock } from '@/features/security/useAppLock';
import { useLedger } from '@/state/ledger';
import { useReviewCount } from '@/state/hooks';
import { useSettings } from '@/state/settings';
import { Button, Card, Chip, ListRow, Screen, ScreenHeader, showDialog, Text, ThemeToggle, Toggle } from '@/ui/components';
import { useColors } from '@/ui/theme';

const VERSION = Constants.expoConfig?.version ?? '';
// Testers report problems here. The issue starts with the version and Android release, nothing personal.
const feedbackUrl = () =>
  `https://github.com/CollinsWoelinam/Ledgr/issues/new?body=${encodeURIComponent(`\n\n---\nLedgr ${VERSION} · Android ${Platform.Version}`)}`;

// FR-6: control. Backup is shown but switched off until it exists.
export default function SettingsScreen() {
  const c = useColors();
  const { monthStartDay, setMonthStartDay, currency, dataSource, providers, appLock, setAppLock, lockAfterMs, setLockAfterMs, budgetAlerts, setBudgetAlerts, weeklySummary, setWeeklySummary } = useSettings();
  // Notification permission can be changed in Android settings at any time, so it's re-checked on each visit.
  const [notificationsOn, setNotificationsOn] = useState(true);
  useFocusEffect(useCallback(() => void notificationsAllowed(false).then(setNotificationsOn), []));
  const toggleNotice = (setter: (on: boolean) => void) => async (on: boolean) => {
    if (on && !(await notificationsAllowed(true))) {
      showDialog('Notifications are off for Ledgr', 'To get budget alerts and the weekly summary, allow notifications in Android Settings › Apps › Ledgr › Notifications.');
      setNotificationsOn(false);
      return;
    }
    setNotificationsOn(true);
    setter(on);
  };

  // Turning the lock on needs a phone screen lock and one successful unlock; turning it off needs an unlock too,
  // so someone holding an unlocked phone can't just switch it off.
  const toggleLock = async (on: boolean) => {
    if (on && !(await phoneHasScreenLock())) {
      showDialog('Set up a screen lock first', 'App lock uses your phone’s fingerprint or PIN. Add one in Android Settings › Security, then try again.');
      return;
    }
    if (await confirmWithLock(on ? 'Turn on app lock' : 'Turn off app lock')) setAppLock(on);
  };
  const resetSettings = useSettings((s) => s.reset);
  const { categories, encrypted, reset: resetLedger, loadDemo } = useLedger();
  const review = useReviewCount();
  const wallets = bundledConfig.providers.filter((p) => providers.includes(p.id)).map((p) => p.name).join(', ') || 'None';

  // FR-6.3: delete all data in one action.
  const deleteAll = () =>
    showDialog('Delete all data?', 'This removes every transaction, budget, category and setting from this phone. It cannot be undone.', [
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
    <Screen tab>
      <ScreenHeader title="Settings" />

      <Card tone="hero" style={{ borderRadius: 24, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="shield-checkmark-outline" size={22} color={c.onAccent} />
          </View>
          <Text variant="heading" size={18} color={c.heroText} style={{ flex: 1 }}>
            Everything stays on this phone
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {['SMS read on-device', ...(encrypted ? ['Encrypted database'] : []), 'Nothing uploaded', 'No ads or trackers'].map((label) => (
            <View key={label} style={{ backgroundColor: c.heroAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
              <Text variant="caption" color="#D4E3DC">
                {label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Group title="Money">
        <ListRow title="Month starts on" detail="Match your payday" right={<Stepper value={monthStartDay} onChange={setMonthStartDay} />} />
        <ListRow
          title="Budget alerts"
          detail={budgetAlerts && !notificationsOn ? 'Notifications are off for Ledgr in Android settings' : 'When a budget reaches 80% and 100%'}
          divider
          right={<Toggle value={budgetAlerts && notificationsOn} onChange={toggleNotice(setBudgetAlerts)} label="Budget alerts" />}
        />
        <ListRow
          title="Weekly summary"
          detail={weeklySummary && !notificationsOn ? 'Notifications are off for Ledgr in Android settings' : 'Sundays at 7 pm: your week’s spending'}
          divider
          right={<Toggle value={weeklySummary && notificationsOn} onChange={toggleNotice(setWeeklySummary)} label="Weekly summary" />}
        />
        <ListRow title="Wallets" value={wallets} divider onPress={() => router.push('/wallets')} />
        <ListRow title="Currency" value={currency} divider />
      </Group>

      <Group title="Appearance">
        <ListRow title="Theme" right={<ThemeToggle />} />
      </Group>

      <Group title="Data">
        <ListRow title="Categories & rules" value={String(categories.length)} onPress={() => router.push('/categories')} />
        <ListRow
          title="Needs review"
          divider
          onPress={() => router.push('/review')}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {review.total > 0 && (
                <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: c.noticeInk, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                  <Text variant="caption" weight="bold" color={c.onNotice}>
                    {review.total}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={c.muted} />
            </View>
          }
        />
        {dataSource === 'demo' && <ListRow title="Reset demo data" detail="Restore the original sample transactions" divider onPress={loadDemo} />}
        <ListRow title="Export CSV or PDF" detail="Your transactions, for spreadsheets or records" divider onPress={() => router.push('/export')} />
        <ListRow title="Send feedback" detail="Report a problem or a message Ledgr misread (opens GitHub)" divider onPress={() => Linking.openURL(feedbackUrl())} />
      </Group>

      <Group title="Security">
        <ListRow title="App lock" detail="Fingerprint or your phone’s PIN" right={<Toggle value={appLock} onChange={toggleLock} label="App lock" />} />
        {appLock && (
          <View style={{ gap: 8, paddingBottom: 14 }}>
            <Text variant="caption" muted>
              Lock again when I leave the app
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {LOCK_AFTER_OPTIONS.map((o) => (
                <Chip key={o.ms} label={o.label} selected={lockAfterMs === o.ms} onPress={() => setLockAfterMs(o.ms)} />
              ))}
            </View>
          </View>
        )}
        <ListRow title="Encrypted backup" detail="Locked with your passphrase · coming in v1.1" value="Off" divider disabled />
      </Group>

      <Button title="Delete all data" kind="danger" icon={<Ionicons name="trash-outline" size={18} color={c.danger} />} onPress={deleteAll} />

      <Text variant="caption" muted style={{ textAlign: 'center' }}>
        Ledgr {VERSION}
      </Text>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="overline" muted style={{ paddingHorizontal: 4 }}>
        {title}
      </Text>
      <Card style={{ borderRadius: 22, paddingVertical: 0 }}>{children}</Card>
    </View>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const c = useColors();
  const step = (label: string, next: number, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => onChange(next)}
      style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 11, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <Text variant="heading" size={18}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.bg, borderRadius: 14, padding: 3 }}>
      {step('−', value - 1, 'Earlier day')}
      <Text numeric weight="semibold" size={15} style={{ minWidth: 28, textAlign: 'center' }} accessibilityLiveRegion="polite">
        {value}
      </Text>
      {step('+', value + 1, 'Later day')}
    </View>
  );
}
