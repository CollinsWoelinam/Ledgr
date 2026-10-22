import { View } from 'react-native';
import { useColors } from '../theme';
import { Text } from './Text';

export type PillTone = 'over' | 'warn' | 'ok' | 'notice';

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  const c = useColors();
  const look = {
    over: { bg: c.over, fg: '#FFFFFF' },
    warn: { bg: c.warnSoft, fg: c.warnInk },
    ok: { bg: c.okSoft, fg: c.okInk },
    notice: { bg: c.noticeInk, fg: '#FFFFFF' },
  }[tone];
  return (
    <View style={{ backgroundColor: look.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
      <Text variant="caption" weight="semibold" color={look.fg}>
        {label}
      </Text>
    </View>
  );
}
