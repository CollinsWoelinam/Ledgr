import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import type { ColorValue } from 'react-native';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { useColors } from '@/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

// The tab bar passes back the string tints set in screenOptions.
const icon = (name: IconName) => ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <Ionicons name={(focused ? name : `${name}-outline`) as IconName} size={24} color={color as string} />
);

export default function TabsLayout() {
  const c = useColors();
  const onboarded = useSettings((s) => s.onboarded);
  const reviewCount = useLedger((s) => s.reviewQueue.length);
  if (!onboarded) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: c.text },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Transactions', tabBarIcon: icon('list'), tabBarBadge: reviewCount || undefined, tabBarBadgeStyle: { backgroundColor: c.warn } }}
      />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets', tabBarIcon: icon('wallet') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
