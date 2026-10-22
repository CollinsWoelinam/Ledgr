import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useSettings } from '@/state/settings';
import { FloatingTabBar } from '@/ui/navigation/FloatingTabBar';
import { useColors } from '@/ui/theme';

export default function TabsLayout() {
  const c = useColors();
  const onboarded = useSettings((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/welcome" />;

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Activity' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
