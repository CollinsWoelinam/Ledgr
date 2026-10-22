import { View } from 'react-native';
import { radius, useColors } from '../theme';

// `pace` draws a tick at how much of the period has elapsed (0–1), so ahead/behind is visible at a glance.
export function ProgressBar({ ratio, color, trackColor, height = 8, pace, paceColor }: {
  ratio: number;
  color?: string;
  trackColor?: string;
  height?: number;
  pace?: number;
  paceColor?: string;
}) {
  const c = useColors();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={{ height, borderRadius: radius.pill, backgroundColor: trackColor ?? c.track }}
    >
      <View style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`, height: '100%', backgroundColor: color ?? c.inverse, borderRadius: radius.pill }} />
      {pace !== undefined && (
        <View style={{ position: 'absolute', left: `${Math.min(pace, 1) * 100}%`, top: -4, width: 2, height: height + 8, borderRadius: 1, backgroundColor: paceColor ?? c.ink }} />
      )}
    </View>
  );
}
