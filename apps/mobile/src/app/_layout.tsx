import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
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
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const dataSource = useSettings((s) => s.dataSource);
  const hasData = useLedger((s) => s.transactions.length > 0);
  const loadDemo = useLedger((s) => s.loadDemo);

  // Demo data lives in memory, so it is re-seeded on each launch. Real data will come from the database.
  useEffect(() => {
    if (hydrated && dataSource === 'demo' && !hasData) loadDemo();
  }, [hydrated, dataSource, hasData, loadDemo]);

  if (!hydrated || !fontsLoaded) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.bg, card: c.surface, text: c.ink, border: c.line, primary: c.okInk } };

  // Every screen draws its own header (ScreenHeader), as in the redesign.
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </ThemeProvider>
  );
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(useSettings.persist.hasHydrated());
  useEffect(() => useSettings.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}
