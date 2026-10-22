import { Pressable } from 'react-native';
import { radius, space, useColors } from '../theme';
import { Text } from './Text';

export function Chip({ label, selected, onPress, color }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingVertical: space.sm - 1,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? (color ?? c.primary) : c.border,
        backgroundColor: selected ? (color ? `${color}22` : c.primarySoft) : c.card,
      }}
    >
      {/* Category colours are too light for text, so they only tint the border and fill. */}
      <Text variant="label" color={selected && !color ? c.primary : c.text} style={selected ? { fontWeight: '600' } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}
