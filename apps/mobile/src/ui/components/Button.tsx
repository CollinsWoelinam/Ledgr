import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { radius, useColors } from '../theme';
import { Text } from './Text';

type Kind = 'primary' | 'accent' | 'ghost' | 'danger' | 'dashed';

export function Button({ title, kind = 'primary', small, icon, textColor, onPress, style, ...props }: PressableProps & { title: string; kind?: Kind; small?: boolean; icon?: ReactNode; textColor?: string }) {
  const c = useColors();
  const look = {
    primary: { bg: c.inverse, fg: c.onInverse, border: 'transparent' },
    accent: { bg: c.accent, fg: c.onAccent, border: 'transparent' },
    ghost: { bg: 'transparent', fg: c.okInk, border: 'transparent' },
    danger: { bg: c.dangerBg, fg: c.danger, border: c.dangerBorder },
    dashed: { bg: 'transparent', fg: c.ink, border: c.muted },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={(state) => [
        {
          height: small ? 38 : 56,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: small ? radius.pill : 20,
          backgroundColor: look.bg,
          borderWidth: kind === 'danger' || kind === 'dashed' ? 1 : 0,
          borderStyle: kind === 'dashed' ? 'dashed' : 'solid',
          borderColor: look.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: props.disabled ? 0.45 : state.pressed ? 0.75 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {icon}
      <Text variant="label" weight="semibold" size={small ? 13 : 16} color={textColor ?? look.fg}>
        {title}
      </Text>
    </Pressable>
  );
}
