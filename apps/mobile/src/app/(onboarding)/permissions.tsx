import Ionicons from '@expo/vector-icons/Ionicons';
import { bundledConfig } from '@ledgr/parser';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/settings';
import { Button, IconButton, showDialog, Text } from '@/ui/components';
import { useColors } from '@/ui/theme';

const toImport = (source: 'demo' | 'sms') => router.push({ pathname: '/import', params: { source } });

// Monogram tiles per provider; unknown providers fall back to initials.
const BADGES: Record<string, { mono: string; bg: string; ink: string }> = {
  mtn_momo: { mono: 'MTN', bg: '#FFE27A', ink: '#3D3000' },
  telecel_cash: { mono: 'TC', bg: '#FAD4D4', ink: '#8A1C1C' },
  at_money: { mono: 'AT', bg: '#D6E4FB', ink: '#1E3A8A' },
};

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

        <View style={{ gap: 10 }}>
          {bundledConfig.providers.map((p) => {
            const on = selected.includes(p.id);
            const badge = BADGES[p.id] ?? { mono: p.name.slice(0, 2).toUpperCase(), bg: c.surfaceAlt, ink: c.ink };
            return (
              <Pressable
                key={p.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(p.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 72, paddingHorizontal: 16, borderRadius: 22, backgroundColor: c.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.ink : c.line }}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: badge.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text variant="caption" size={13} weight="bold" color={badge.ink}>
                    {badge.mono}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label" size={16} weight="semibold">
                    {p.name}
                  </Text>
                  <Text variant="caption" muted>
                    Sender: {p.senderIds.join(', ')}
                  </Text>
                </View>
                <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.inverse : 'transparent', borderWidth: 2, borderColor: on ? c.inverse : c.muted }}>
                  {on && <Ionicons name="checkmark" size={16} color={c.onInverse} />}
                </View>
              </Pressable>
            );
          })}
        </View>

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
