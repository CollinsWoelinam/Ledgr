import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { useColors } from '@/ui/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useColors();
  const hydrated = useHydrated();
  const dataSource = useSettings((s) => s.dataSource);
  const hasData = useLedger((s) => s.transactions.length > 0);
  const loadDemo = useLedger((s) => s.loadDemo);

  // Demo data lives in memory, so it is re-seeded on each launch. Real data will come from the database.
  useEffect(() => {
    if (hydrated && dataSource === 'demo' && !hasData) loadDemo();
  }, [hydrated, dataSource, hasData, loadDemo]);

  if (!hydrated) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.bg, card: c.card, text: c.text, border: c.border, primary: c.primary } };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="transaction/[id]" options={{ title: 'Transaction' }} />
        <Stack.Screen name="insights" options={{ title: 'Insights' }} />
        <Stack.Screen name="review" options={{ title: 'Needs review' }} />
        <Stack.Screen name="categories" options={{ title: 'Categories' }} />
      </Stack>
    </ThemeProvider>
  );
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(useSettings.persist.hasHydrated());
  useEffect(() => useSettings.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}
