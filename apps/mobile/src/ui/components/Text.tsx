import { Text as RNText, type TextProps } from 'react-native';
import { useColors } from '../theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const SIZES: Record<Variant, { fontSize: number; fontWeight: '400' | '500' | '600' | '700'; lineHeight: number }> = {
  display: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  heading: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '500', lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

export function Text({ variant = 'body', muted, color, style, ...props }: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const c = useColors();
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[SIZES[variant], { color: color ?? (muted ? c.muted : c.text), fontVariant: ['tabular-nums'] }, style]}
      {...props}
    />
  );
}
