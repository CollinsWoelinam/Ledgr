import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { PermissionsAndroid, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/settings';
import { Button, IconButton, showDialog, Text, WalletPicker } from '@/ui/components';
import { useColors } from '@/ui/theme';

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
        showDialog('SMS access not granted', 'You can still explore Ledgr with demo data, and allow SMS access later.', [
          { text: 'Try again', onPress: requestSms },
          { text: 'Use demo data', onPress: () => toImport('demo') },
        ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Welcome (still mounted underneath) sets light icons for its dark background. */}
      <StatusBar style="auto" />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <View accessibilityLabel="Step 1 of 2" style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.ink }} />
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.chipBorder }} />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="title" size={32} style={{ lineHeight: 35 }} accessibilityRole="header">
            Which wallets do you use?
          </Text>
          <Text muted style={{ lineHeight: 22 }}>
            Ledgr only reads messages from these senders. Everything else on your phone is ignored.
          </Text>
        </View>

        <WalletPicker selected={selected} onToggle={toggle} />

        <View style={{ flexDirection: 'row', gap: 12, backgroundColor: c.okSoft, borderRadius: 22, padding: 16 }}>
          <Ionicons name="shield-checkmark-outline" size={22} color={c.okInk} />
          <Text size={14} color={c.okInk} style={{ flex: 1, lineHeight: 21 }}>
            Android will ask to let Ledgr read SMS. Messages are processed on this phone and never leave it.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: 4 }}>
          <Button title="Allow SMS access" disabled={busy || selected.length === 0} onPress={requestSms} />
          <Button title="Use demo data instead" kind="ghost" style={{ height: 44 }} onPress={() => toImport('demo')} />
        </View>
      </View>
    </SafeAreaView>
  );
}
