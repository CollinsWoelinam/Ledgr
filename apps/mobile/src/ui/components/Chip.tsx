import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { radius, useColors } from '../theme';
import { Text } from './Text';

// Selected chips go solid dark. A category colour shows as a dot, never as text colour.
export function Chip({ label, selected, onPress, dot }: { label: string; selected?: boolean; onPress?: () => void; dot?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={{
        height: 38,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: selected ? c.inverse : c.chipBorder,
        backgroundColor: selected ? c.inverse : c.surface,
      }}
    >
      {dot && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />}
      <Text variant="label" size={13} weight={selected ? 'semibold' : 'medium'} color={selected ? c.onInverse : c.ink}>
        {label}
      </Text>
    </Pressable>
  );
}
