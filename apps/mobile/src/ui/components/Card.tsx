import { View, type ViewProps } from 'react-native';
import { radius, space, useColors } from '../theme';

export function Card({ style, ...props }: ViewProps) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: c.border }, style]} {...props} />;
}
