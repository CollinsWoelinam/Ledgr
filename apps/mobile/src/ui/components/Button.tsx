import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';
import { radius, space, useColors } from '../theme';
import { Text } from './Text';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ title, kind = 'primary', onPress, style, ...props }: PressableProps & { title: string; kind?: Kind }) {
  const c = useColors();
  const bg = { primary: c.primary, secondary: c.cardAlt, ghost: 'transparent', danger: 'transparent' }[kind];
  const fg = { primary: c.primaryText, secondary: c.text, ghost: c.primary, danger: c.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={(state) => [
        { backgroundColor: bg, borderRadius: radius.md, paddingVertical: space.md + 2, paddingHorizontal: space.lg, alignItems: 'center', opacity: state.pressed || props.disabled ? 0.6 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text variant="label" color={fg} style={{ fontWeight: '600' }}>
        {title}
      </Text>
    </Pressable>
  );
}
