import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '../theme';

export type IconName = keyof typeof Ionicons.glyphMap;

// 44px circle: the mockups' back, add and bell buttons.
export function IconButton({ icon, label, onPress, filled, badge }: { icon: IconName; label: string; onPress: () => void; filled?: boolean; badge?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? c.inverse : c.surface,
        borderWidth: filled ? 0 : 1,
        borderColor: c.line,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={filled ? c.onInverse : c.ink} />
      {badge && <Dot />}
    </Pressable>
  );

  function Dot(): ReactNode {
    return <View style={{ position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: c.noticeInk, borderWidth: 2, borderColor: c.surface }} />;
  }
}
