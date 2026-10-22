import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { space, useColors } from '../theme';
import { Text } from './Text';

export function ListRow({ icon, title, detail, onPress, right, danger, disabled }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: disabled ? 0.45 : pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={22} color={danger ? c.danger : c.muted} />
      <View style={{ flex: 1 }}>
        <Text variant="label" color={danger ? c.danger : undefined}>
          {title}
        </Text>
        {detail && (
          <Text variant="caption" muted>
            {detail}
          </Text>
        )}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={c.muted} />)}
    </Pressable>
  );
}
