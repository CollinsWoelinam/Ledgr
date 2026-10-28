import Ionicons from '@expo/vector-icons/Ionicons';
import { bundledConfig } from '@ledgr/parser';
import { Pressable, View } from 'react-native';
import { useColors } from '../theme';
import { Text } from './Text';

// Monogram tiles per provider; unknown providers fall back to initials.
const BADGES: Record<string, { mono: string; bg: string; ink: string }> = {
  mtn_momo: { mono: 'MTN', bg: '#FFE27A', ink: '#3D3000' },
  telecel_cash: { mono: 'TC', bg: '#FAD4D4', ink: '#8A1C1C' },
  at_money: { mono: 'AT', bg: '#D6E4FB', ink: '#1E3A8A' },
};

// A wallet Ledgr has message formats for. Others are shown as coming soon, not offered.
export const walletSupported = (id: string) => bundledConfig.templates.some((t) => t.provider === id);

// FR-1.3: the wallets whose SMS Ledgr reads. Used at first launch and in Settings.
export function WalletPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      {bundledConfig.providers.map((p) => {
        const supported = walletSupported(p.id);
        const on = supported && selected.includes(p.id);
        const badge = BADGES[p.id] ?? { mono: p.name.slice(0, 2).toUpperCase(), bg: c.surfaceAlt, ink: c.ink };
        return (
          <Pressable
            key={p.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: !supported }}
            accessibilityHint={supported ? undefined : 'Coming soon'}
            disabled={!supported}
            onPress={() => onToggle(p.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 72, paddingHorizontal: 16, borderRadius: 22, backgroundColor: c.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.ink : c.line, opacity: supported ? 1 : 0.55 }}
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
                {supported ? `Sender: ${p.senderIds.join(', ')}` : 'Coming soon'}
              </Text>
            </View>
            {supported && (
              <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.inverse : 'transparent', borderWidth: 2, borderColor: on ? c.inverse : c.muted }}>
                {on && <Ionicons name="checkmark" size={16} color={c.onInverse} />}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
