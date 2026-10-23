import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadLedger } from '@/db/repositories/ledger';
import { openTestDb } from '@/db/testing/nodeDb';
import { flushLedgerWrites, useLedger } from '@/state/ledger';
import type { InboxSms } from '../../../modules/ledgr-sms';
import { classify, sendersFor } from './pipeline';

// Real (anonymized) MTN messages from the parser's fixture corpus, shaped as the native module returns them.
const FIXTURES = join(__dirname, '../../../../../packages/parser/fixtures/mtn_momo');
const inbox: InboxSms[] = readdirSync(FIXTURES)
  .sort()
  .map((f, i) => {
    const fx = JSON.parse(readFileSync(join(FIXTURES, f), 'utf8'));
    return { id: String(i + 1), sender: fx.sms.sender, body: fx.sms.body, receivedAt: new Date(fx.sms.receivedAt).getTime() };
  });
const unknown: InboxSms = { id: '999', sender: 'MobileMoney', body: 'Your voucher 4471902 with GHS 20.00 has expired. Financial Transaction Id: 72015583955.', receivedAt: 1 };

test('classifies transactions, review items and ignored messages', () => {
  const { transactions, review, ignored } = classify([...inbox, unknown]);
  expect(transactions).toHaveLength(inbox.length - 4); // the corpus has 4 ignored samples
  expect(ignored).toBe(4);
  expect(review).toEqual([{ id: 'sms-999', sender: 'MobileMoney', body: unknown.body, receivedAt: 1 }]);
  expect(transactions.every((t) => t.source === 'sms' && t.smsBody && t.id.startsWith('mtn_momo:'))).toBe(true);
});

test('senders follow the wallets the user picked', () => {
  expect(sendersFor(['mtn_momo'])).toEqual(['MobileMoney']);
  expect(sendersFor(['mtn_momo', 'telecel_cash'])).toEqual(['MobileMoney', 'T-CASH']);
  expect(sendersFor([])).toEqual([]);
});

test('ingesting the same inbox twice adds nothing the second time, and it all persists', async () => {
  const db = await openTestDb();
  await useLedger.getState().attach(db, false);
  const { transactions, review } = classify([...inbox, unknown]);

  expect(useLedger.getState().ingest(transactions, review)).toEqual({ added: transactions.length, reviewAdded: 1 });
  expect(useLedger.getState().ingest(transactions, review)).toEqual({ added: 0, reviewAdded: 0 });

  await flushLedgerWrites();
  const stored = await loadLedger(db);
  expect(stored.transactions).toHaveLength(transactions.length);
  expect(stored.reviewQueue.map((r) => r.id)).toEqual(['sms-999']);
  // Categorized on the way in: airtime purchases land in Airtime & Data via the system keyword rules.
  expect(stored.transactions.filter((t) => t.counterpartyName === 'MTN AIRTIME').every((t) => t.categoryId === 'airtime')).toBe(true);
  // Newest first in memory, as the screens expect.
  const times = useLedger.getState().transactions.map((t) => t.occurredAt);
  expect(times).toEqual([...times].sort((a, b) => b - a));
});
