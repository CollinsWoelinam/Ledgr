import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { LedgrSms } from '../../../modules/ledgr-sms';
import { sendersFor } from './pipeline';
import { syncInbox } from './sync';

// Keeps the ledger current from SMS (US-02): on launch, on returning to the app, and shortly after a new SMS
// arrives (the inbox needs a moment to store it). Messages that arrived while the app was closed are picked up
// by the launch and foreground scans, as the PRD's risk table suggests.
export function useSmsSync(): void {
  const ready = useLedger((s) => s.ready);
  const source = useSettings((s) => s.dataSource);
  const providers = useSettings((s) => s.providers);

  // Lets Android wake Ledgr for these senders while it's closed; turned off with demo data or after Delete all data.
  useEffect(() => {
    LedgrSms?.setWatchedSenders(source === 'sms' ? sendersFor(providers) : []);
  }, [source, providers]);

  useEffect(() => {
    const sms = LedgrSms;
    if (!ready || source !== 'sms' || !sms) return;
    let running: Promise<unknown> | null = null;
    const run = () => {
      running ??= syncInbox()
        .catch((e) => console.warn('[sms] sync failed', e))
        .finally(() => (running = null));
    };

    run();
    const app = AppState.addEventListener('change', (state) => state === 'active' && run());
    const arrived = sms.addListener('onSmsArrived', () => setTimeout(run, 1500));
    return () => {
      app.remove();
      arrived.remove();
    };
  }, [ready, source]);
}
