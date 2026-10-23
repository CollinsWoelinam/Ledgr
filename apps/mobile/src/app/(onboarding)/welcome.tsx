import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Logo, Text } from '@/ui/components';
import { useColors } from '@/ui/theme';

const BG = '#0B221C';

// FR-1.1: earn trust before asking for SMS access, by showing what Ledgr does with one message.
export default function WelcomeScreen() {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={36} />
          <Text variant="heading" size={20} weight="bold" color={c.heroText}>
            Ledgr
          </Text>
        </View>

        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
          <View style={{ alignSelf: 'flex-start', maxWidth: 290, backgroundColor: '#1A3A31', borderRadius: 20, borderBottomLeftRadius: 6, paddingVertical: 14, paddingHorizontal: 16, gap: 6 }}>
            <Text variant="overline" size={11} color={c.heroMuted}>
              SMS · MobileMoney
            </Text>
            <Text size={13} color="#D4E3DC" style={{ lineHeight: 20 }}>
              Payment made for GHS 45.00 to KWAME MENSAH Current Balance: GHS 1,370.36 . Available Balance: GHS 1,370.36. Reference: lunch…
            </Text>
          </View>
          <View style={{ alignSelf: 'center', width: 40, height: 40, borderRadius: 20, backgroundColor: c.heroAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-down" size={20} color={c.accent} />
          </View>
          <View style={{ alignSelf: 'flex-end', width: 300, maxWidth: '100%', backgroundColor: '#FFFFFF', borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 16 } }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#D9F4F0', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="people-outline" size={20} color="#0F766E" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" weight="semibold" color="#0D1714">
                Kwame Mensah
              </Text>
              <Text variant="caption" color="#56635D">
                Transfers · just now
              </Text>
            </View>
            <Text numeric weight="bold" size={16} color="#0D1714">
              −45.00
            </Text>
          </View>
          <View style={{ alignSelf: 'flex-end', backgroundColor: c.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <Text variant="caption" weight="semibold" color={c.onAccent}>
              Sorted automatically
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text variant="display" size={36} color={c.heroText} style={{ lineHeight: 39 }} accessibilityRole="header">
            Your MoMo alerts, turned into a money diary.
          </Text>
          <Text size={16} color="#B9CDC5" style={{ lineHeight: 24 }}>
            Ledgr reads mobile money SMS on your phone and sorts every cedi. Nothing to type. Nothing uploaded.
          </Text>
        </View>

        <View style={{ gap: 4 }}>
          <Button title="Get started" kind="accent" onPress={() => router.push('/permissions')} />
          <Button title="Try it with demo data" kind="ghost" textColor={c.accent} style={{ height: 44 }} onPress={() => router.push({ pathname: '/import', params: { source: 'demo' } })} />
        </View>
      </View>
    </SafeAreaView>
  );
}
