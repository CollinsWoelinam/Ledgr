import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { openLedgerDb } from '@/db/client';
import { useSmsSync } from '@/features/sms/useSmsSync';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { EmptyState } from '@/ui/components';
import { useColors } from '@/ui/theme';

// Keep the native splash up until fonts, settings and the database are ready, instead of a blank screen.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useColors();
  const hydrated = useHydrated();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const dataSource = useSettings((s) => s.dataSource);
  const ledgerReady = useLedger((s) => s.ready);
  const hasData = useLedger((s) => s.transactions.length > 0);
  const loadDemo = useLedger((s) => s.loadDemo);
  const dbError = useLedgerDatabase();
  useSmsSync();

  // Demo mode with an empty database (e.g. the first launch after an upgrade): seed it once.
  useEffect(() => {
    if (ledgerReady && dataSource === 'demo' && !hasData) loadDemo();
  }, [ledgerReady, dataSource, hasData, loadDemo]);

  const ready = hydrated && fontsLoaded && (ledgerReady || !!dbError);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.bg }}>
        <EmptyState icon="alert-circle-outline" title="Ledgr couldn’t open its data" body={`Your data has not been changed. Restart the app to try again. (${dbError})`} />
      </View>
    );
  }

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

// Opens the encrypted database once and loads the ledger from it. Returns an error message if that fails.
function useLedgerDatabase(): string | null {
  const attach = useLedger((s) => s.attach);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    openLedgerDb()
      .then(({ db, encrypted }) => attach(db, encrypted))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [attach]);
  return error;
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(useSettings.persist.hasHydrated());
  useEffect(() => useSettings.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}
