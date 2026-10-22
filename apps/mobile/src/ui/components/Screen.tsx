import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space, TAB_BAR_CLEARANCE, useColors } from '../theme';

// Scrollable page. `tab` leaves room for the floating tab bar.
export function Screen({ children, tab, contentContainerStyle, ...props }: ScrollViewProps & { children: ReactNode; tab?: boolean }) {
  const c = useColors();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingHorizontal: space.xl, paddingTop: space.md, gap: 14, paddingBottom: tab ? TAB_BAR_CLEARANCE : space.xxl }, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
