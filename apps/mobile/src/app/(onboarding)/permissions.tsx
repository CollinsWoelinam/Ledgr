import Ionicons from '@expo/vector-icons/Ionicons';
import { bundledConfig } from '@ledgr/parser';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/settings';
import { Button, Card, Text } from '@/ui/components';
import { space, useColors } from '@/ui/theme';

const toImport = (source: 'demo' | 'sms') => router.push({ pathname: '/import', params: { source } });

// FR-1.2, FR-1.3: pick providers, then request SMS access with a fallback.
export default function PermissionsScreen() {
  const c = useColors();
  const selected = useSettings((s) => s.providers);
  const setProviders = useSettings((s) => s.setProviders);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setProviders(selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id]);

  const requestSms = async () => {
    if (Platform.OS !== 'android') return toImport('demo');
    setBusy(true);
    try {
      const result = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.READ_SMS!, PermissionsAndroid.PERMISSIONS.RECEIVE_SMS!]);
      const granted = Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
      if (granted) toImport('sms');
      else
        Alert.alert('SMS access not granted', 'You can still explore Ledgr with demo data, and allow SMS access later in Settings.', [
          { text: 'Try again', onPress: requestSms },
          { text: 'Use demo data', onPress: () => toImport('demo') },
        ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, padding: space.xl, gap: space.lg }}>
        <Text variant="title">Which wallets do you use?</Text>
        <Text muted>Ledgr only reads messages from these senders and ignores everything else.</Text>
        <View style={{ gap: space.sm }}>
          {bundledConfig.providers.map((p) => {
            const on = selected.includes(p.id);
            return (
              <Pressable key={p.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(p.id)}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, borderColor: on ? c.primary : c.border }}>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? c.primary : c.muted} />
                  <Text variant="label">{p.name}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>
        <Card style={{ flexDirection: 'row', gap: space.md, backgroundColor: c.primarySoft, borderColor: c.primarySoft }}>
          <Ionicons name="shield-checkmark" size={22} color={c.primary} />
          <Text style={{ flex: 1 }}>Android will ask to let Ledgr read SMS. Messages are processed on this phone and never uploaded.</Text>
        </Card>
      </View>
      <View style={{ padding: space.xl, gap: space.sm }}>
        <Button title="Allow SMS access" disabled={busy || selected.length === 0} onPress={requestSms} />
        <Button title="Explore with demo data" kind="ghost" onPress={() => toImport('demo')} />
      </View>
    </SafeAreaView>
  );
}
