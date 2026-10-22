import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, View } from 'react-native';
import { useLedger } from '@/state/ledger';
import { useColors } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, IconName> = {
  index: 'home',
  transactions: 'list',
  insights: 'pie-chart',
  budgets: 'wallet',
  settings: 'options',
};

// The dark floating pill from the redesign. The active tab sits in an accent circle.
export function FloatingTabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  const c = useColors();
  const reviewCount = useLedger((s) => s.reviewQueue.length);

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: Math.max(insets.bottom, 12) + 8,
        height: 64,
        borderRadius: 32,
        backgroundColor: c.tabBar,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        shadowColor: '#0D1714',
        shadowOpacity: 0.25,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      }}
    >
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const icon = ICONS[route.name] ?? 'ellipse';
        const label = descriptors[route.key]?.options.title ?? route.name;
        const badge = route.name === 'transactions' && reviewCount > 0;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={badge ? `${label}, ${reviewCount} to review` : label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              if (focused) return;
              Haptics.selectionAsync().catch(() => {});
              navigateToTab(route.key);
            }}
            style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? c.accent : 'transparent' }}
          >
            <Ionicons name={(focused ? icon : `${icon}-outline`) as IconName} size={22} color={focused ? c.onAccent : c.tabIcon} />
            {badge && !focused && (
              <View style={{ position: 'absolute', top: 9, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: c.noticeInk, borderWidth: 2, borderColor: c.tabBar }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
