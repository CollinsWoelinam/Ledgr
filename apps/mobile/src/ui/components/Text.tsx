import { Text as RNText, type TextProps } from 'react-native';
import { fonts, useColors, type Weight } from '../theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'overline';

// Display variants use Space Grotesk; the rest use Inter. `numeric` switches body text to Space Grotesk for figures.
const VARIANTS: Record<Variant, { size: number; line: number; weight: Weight; display: boolean }> = {
  display: { size: 40, line: 44, weight: 'bold', display: true },
  title: { size: 30, line: 34, weight: 'bold', display: true },
  heading: { size: 17, line: 22, weight: 'semibold', display: true },
  body: { size: 15, line: 21, weight: 'regular', display: false },
  label: { size: 15, line: 20, weight: 'medium', display: false },
  caption: { size: 12, line: 16, weight: 'regular', display: false },
  overline: { size: 12, line: 16, weight: 'semibold', display: false },
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  numeric?: boolean;
  size?: number;
  muted?: boolean;
  color?: string;
}

export function Text({ variant = 'body', weight, numeric, size, muted, color, style, ...props }: AppTextProps) {
  const c = useColors();
  const v = VARIANTS[variant];
  const display = v.display || numeric;
  const fontSize = size ?? v.size;
  return (
    <RNText
      maxFontSizeMultiplier={1.5}
      style={[
        {
          fontFamily: (display ? fonts.display : fonts.body)[weight ?? v.weight],
          fontSize,
          lineHeight: size ? Math.round(size * 1.2) : v.line,
          color: color ?? (muted ? c.muted : c.ink),
          letterSpacing: display ? -0.02 * fontSize : variant === 'overline' ? 0.5 : 0,
          textTransform: variant === 'overline' ? 'uppercase' : undefined,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
      {...props}
    />
  );
}
