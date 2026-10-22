import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '../theme';
import { Text } from './Text';

// Settings-style row: title, optional detail underneath, value or control on the right.
export function ListRow({ title, detail, value, onPress, right, divider, disabled }: {
  title: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  divider?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: detail ? 58 : 52,
        borderTopWidth: divider ? 1 : 0,
        borderColor: c.divider,
        opacity: disabled ? 0.45 : pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="label">{title}</Text>
        {detail && (
          <Text variant="caption" muted>
            {detail}
          </Text>
        )}
      </View>
      {value && <Text muted>{value}</Text>}
      {right}
      {onPress && !right && <Ionicons name="chevron-forward" size={18} color={c.muted} />}
    </Pressable>
  );
}
