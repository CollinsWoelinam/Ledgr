import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { LedgrSms } from '../../../modules/ledgr-sms';
import { classify, sendersFor } from './pipeline';

const PAGE = 500;

export interface SyncResult {
  read: number;
  added: number;
  review: number;
}

export const smsAvailable = (): boolean => LedgrSms !== null;

// Reads the inbox from the saved cursor in pages, ingests each page, and advances the cursor.
// Safe to call repeatedly: the cursor and the ledger's dedupe make it idempotent.
export async function syncInbox(onProgress?: (read: number, total: number) => void): Promise<SyncResult> {
  if (!LedgrSms) throw new Error('SMS reading needs a development or release build');
  const { providers, smsCursor, setSmsCursor } = useSettings.getState();
  const senders = sendersFor(providers);
  const total = await LedgrSms.countInbox(senders, smsCursor);
  const result: SyncResult = { read: 0, added: 0, review: 0 };
  let cursor = smsCursor;

  for (;;) {
    const page = await LedgrSms.readInbox(senders, cursor, PAGE);
    if (page.length === 0) break;
    const { transactions, review } = classify(page);
    const { added, reviewAdded } = useLedger.getState().ingest(transactions, review);
    result.read += page.length;
    result.added += added;
    result.review += reviewAdded;
    cursor = page[page.length - 1]!.receivedAt;
    setSmsCursor(cursor);
    onProgress?.(result.read, total);
    if (page.length < PAGE) break;
  }
  return result;
}
