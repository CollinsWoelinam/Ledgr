import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '../theme';

export interface Slice {
  value: number;
  color: string;
}

// Segments are drawn as dashed strokes on one circle; a 2px gap separates neighbours.
export function Donut({ slices, size = 160, thickness = 22, children }: { slices: Slice[]; size?: number; thickness?: number; children?: React.ReactNode }) {
  const c = useColors();
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={thickness} fill="none" />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (s.value / total) * circumference;
            const dash = Math.max(len - gap, 0);
            const el = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={thickness}
                fill="none"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </Svg>
      {children}
    </View>
  );
}
