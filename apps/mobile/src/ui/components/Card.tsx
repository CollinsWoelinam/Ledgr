import { View, type ViewProps } from 'react-native';
import { radius, space, useColors } from '../theme';

export function Card({ style, tone = 'surface', ...props }: ViewProps & { tone?: 'surface' | 'hero' | 'notice' }) {
  const c = useColors();
  const tones = {
    surface: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    hero: { backgroundColor: c.hero },
    notice: { backgroundColor: c.noticeBg, borderWidth: 1, borderColor: c.noticeBorder },
  };
  return <View style={[{ borderRadius: radius.lg, padding: space.lg }, tones[tone], style]} {...props} />;
}
