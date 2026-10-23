import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MonthsWithData } from '@/features/insights/months';
import { radius, useColors } from '../theme';
import { Chip } from './Chip';
import { Text } from './Text';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  offset: number; // 0 = this month, -1 = last month…
  onChange: (offset: number) => void;
  months: MonthsWithData;
  currentStart: number; // start of the current period, which offsets count from
}

// ‹ Oct 2026 › — arrows step one month; tapping the label opens a year/month picker for any month with data.
export function MonthNavigator({ offset, onChange, months, currentStart }: Props) {
  const c = useColors();
  const [picking, setPicking] = useState(false);
  const current = new Date(currentStart);
  const shown = new Date(current.getFullYear(), current.getMonth() + offset, 1);
  const label = `${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`;

  const step = (to: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(to);
  };

  const arrow = (icon: 'chevron-back' | 'chevron-forward', to: number, enabled: boolean, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => step(to)}
      hitSlop={6}
      style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', opacity: !enabled ? 0.3 : pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={18} color={c.ink} />
    </Pressable>
  );

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 2 }}>
        {arrow('chevron-back', offset - 1, offset > months.oldest, 'Previous month')}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${shown.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}. Choose a month`}
          onPress={() => setPicking(true)}
          // Fixed width: "Oct 2026" and "Feb 2022" differ, and arrows that shift under the thumb cause mis-taps.
          style={({ pressed }) => ({ height: 34, width: 88, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 })}
        >
          <Text variant="label" size={13} weight="semibold">
            {label}
          </Text>
        </Pressable>
        {arrow('chevron-forward', offset + 1, offset < 0, 'Next month')}
      </View>

      {picking && (
        <MonthPicker
          offset={offset}
          months={months}
          current={current}
          onClose={() => setPicking(false)}
          onPick={(o) => {
            step(o);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}

function MonthPicker({ offset, months, current, onPick, onClose }: { offset: number; months: MonthsWithData; current: Date; onPick: (o: number) => void; onClose: () => void }) {
  const c = useColors();
  const cy = current.getFullYear();
  const cm = current.getMonth();
  const oldestYear = new Date(cy, cm + months.oldest, 1).getFullYear();
  const years = Array.from({ length: cy - oldestYear + 1 }, (_, i) => cy - i);
  const [year, setYear] = useState(new Date(cy, cm + offset, 1).getFullYear());

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: '#0D171488' }} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <View style={{ padding: 24, gap: 18 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.chipBorder }} />
          <Text variant="title" size={24}>
            Choose a month
          </Text>
          {years.length > 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Year">
              {years.map((y) => (
                <Chip key={y} label={String(y)} selected={y === year} onPress={() => setYear(y)} />
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MONTHS.map((name, m) => {
              const o = (year - cy) * 12 + (m - cm);
              const enabled = o <= 0 && months.offsets.has(o);
              const selected = o === offset;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={`${name} ${year}${enabled ? '' : ', no transactions'}`}
                  accessibilityState={{ disabled: !enabled, selected }}
                  disabled={!enabled}
                  onPress={() => onPick(o)}
                  style={{
                    width: '31%',
                    flexGrow: 1,
                    height: 48,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? c.inverse : c.bg,
                    opacity: enabled ? 1 : 0.35,
                  }}
                >
                  <Text variant="label" weight={selected ? 'semibold' : 'medium'} color={selected ? c.onInverse : c.ink}>
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
