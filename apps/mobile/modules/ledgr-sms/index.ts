import { requireOptionalNativeModule, type EventSubscription } from 'expo';

export interface InboxSms {
  id: string;
  sender: string;
  body: string;
  receivedAt: number; // epoch ms
}

interface LedgrSmsModule {
  /** Inbox messages from `senders` after `sinceMs`, oldest first, at most `limit`. */
  readInbox(senders: string[], sinceMs: number, limit: number): Promise<InboxSms[]>;
  countInbox(senders: string[], sinceMs: number): Promise<number>;
  /** Wallet senders that wake Ledgr in the background when it isn't running. Empty turns that off. */
  setWatchedSenders(senders: string[]): void;
  /** Fires while subscribed when an SMS arrives; re-read the inbox to get it. */
  addListener(event: 'onSmsArrived', listener: (e: { sender: string }) => void): EventSubscription;
}

// null in Expo Go and on iOS, where the native module isn't built in.
export const LedgrSms = requireOptionalNativeModule<LedgrSmsModule>('LedgrSms');
