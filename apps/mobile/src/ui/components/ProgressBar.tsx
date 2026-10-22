import { View } from 'react-native';
import { radius, useColors } from '../theme';

// With `budget`, turns amber at 80% and red at 100%, matching the budget alert thresholds (FR-4.3).
export function ProgressBar({ ratio, color, height = 8, budget }: { ratio: number; color?: string; height?: number; budget?: boolean }) {
  const c = useColors();
  const fill = budget && ratio >= 1 ? c.danger : budget && ratio >= 0.8 ? c.warn : (color ?? c.primary);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={{ height, borderRadius: radius.pill, backgroundColor: c.track, overflow: 'hidden' }}
    >
      <View style={{ width: `${Math.min(ratio, 1) * 100}%`, height: '100%', backgroundColor: fill, borderRadius: radius.pill }} />
    </View>
  );
}
