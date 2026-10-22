import { View } from 'react-native';
import { space, useColors } from '../theme';
import { Text } from '../components/Text';

export interface Bar {
  key: string;
  value: number;
  label?: string; // shown under the bar when set
  highlight?: boolean;
}

export function Bars({ bars, height = 120, color }: { bars: Bar[]; height?: number; color?: string }) {
  const c = useColors();
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        {bars.map((b) => (
          <View key={b.key} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View
              style={{
                height: b.value > 0 ? Math.max((b.value / max) * height, 3) : 2,
                backgroundColor: b.value > 0 ? (b.highlight ? c.text : (color ?? c.primary)) : c.track,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 2, marginTop: space.xs }}>
        {bars.map((b) => (
          <View key={b.key} style={{ flex: 1, alignItems: 'center', overflow: 'visible' }}>
            {b.label ? (
              <Text variant="caption" muted numberOfLines={1} style={{ width: 40, textAlign: 'center' }}>
                {b.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
