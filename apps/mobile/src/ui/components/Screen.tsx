import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { space, useColors } from '../theme';

export function Screen({ children, contentContainerStyle, ...props }: ScrollViewProps & { children: ReactNode }) {
  const c = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }, contentContainerStyle]}
      contentInsetAdjustmentBehavior="automatic"
      {...props}
    >
      {children}
    </ScrollView>
  );
}
