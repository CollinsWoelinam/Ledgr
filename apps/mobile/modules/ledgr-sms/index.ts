import type { RawSms } from '@ledgr/parser';

export interface LedgrSms {
  /** Inbox scan for allowlisted senders since a timestamp (historical import / catch-up). */
  readInbox(senders: string[], sinceMs: number): Promise<RawSms[]>;
  /** Live messages from the BroadcastReceiver. */
  addListener(cb: (sms: RawSms) => void): { remove(): void };
}

// TODO: export requireNativeModule('LedgrSms')
export {};
