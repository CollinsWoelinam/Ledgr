import { templatesRevision } from '@ledgr/parser';
import { addReviewItems } from '@/db/repositories/reviewQueue';
import { ensureDefaults, loadLedger } from '@/db/repositories/ledger';
import { openTestDb } from '@/db/testing/nodeDb';
import { flushLedgerWrites, useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import type { InboxSms } from '../../../modules/ledgr-sms';
import { syncInbox } from './sync';

// The phone's inbox, shaped like the real messages (names and numbers made up), oldest first.
const inbox: InboxSms[] = [
  { id: '1', sender: 'MobileMoney', receivedAt: 1000, body: 'Your payment of GHS 3.00 to MTN AIRTIME has been completed at 2023-08-15 21:06:22. Your new balance: GHS 16.22. Fee was GHS 0.00 Tax was GHS -. Reference: -. Financial Transaction Id: 41000000001. External Transaction Id: 41000000001.' },
  { id: '2', sender: 'MobileMoney', receivedAt: 2000, body: 'Transfer made for GHS 5.00 Token: 975087195225 Current Balance: GHS 9.72 Transaction ID: 41000000002. Fee charged GHS1.50 Tax charged: GHS0. Remember to send Token ID and secret code to the receiver.' },
  { id: '3', sender: 'MobileMoney', receivedAt: 2001, body: 'Money Transfer Deposit received for GHS 5.00 from KOFI MENSAH Token: 975087195225 Transaction ID: 41000000002. TRANSACTION FEE IS 0' },
  { id: '4', sender: 'MobileMoney', receivedAt: 3000, body: 'You have received GHS 40.00 from ADB Bank Pull on your mobile money account at 2025-02-25 14:46:11. Message from sender: . Your new balance:GHS 127.89. Financial Transaction Id: 41000000003.' },
  { id: '5', sender: 'MobileMoney', receivedAt: 3001, body: 'Withdrawal made from your bank account number: ****3401. Your Bank Balance:GHS 0.00. Your MM Balance: GHS 127.89. Transaction ID: 41000000003.' },
];

jest.mock('../../../modules/ledgr-sms', () => ({
  LedgrSms: {
    readInbox: async (_senders: string[], since: number, limit: number) => inbox.filter((m) => m.receivedAt > since).slice(0, limit),
    countInbox: async (_senders: string[], since: number) => inbox.filter((m) => m.receivedAt > since).length,
  },
}));

test('after a template update, the inbox is re-read once: new formats recorded, nothing doubled, companions cleared', async () => {
  const db = await openTestDb();
  await ensureDefaults(db);
  await addReviewItems(db, [{ id: 'sms-5', sender: 'MobileMoney', body: inbox[4]!.body, receivedAt: 3001 }]);
  await useLedger.getState().attach(db, false);
  useLedger.getState().ingest([{ id: 'mtn_momo:ref:41000000001', provider: 'mtn_momo', type: 'airtime_data', direction: 'out', amountMinor: 300, feeMinor: 0, taxMinor: 0, currency: 'GHS', counterpartyName: 'MTN AIRTIME', externalRef: '41000000001', balanceAfterMinor: 1622, occurredAt: 1000, source: 'sms' }], []);
  // Everything was read before, with older templates.
  useSettings.setState({ providers: ['mtn_momo'], smsCursor: 3001, parsedWith: 'older-templates' });

  const first = await syncInbox();
  await flushLedgerWrites();
  const stored = await loadLedger(db);
  expect(first.added).toBe(2); // the token transfer and the bank pull
  expect(stored.transactions.map((t) => [t.externalRef, t.direction, t.amountMinor]).sort()).toEqual([
    ['41000000001', 'out', 300],
    ['41000000002', 'out', 500], // the token "deposit" companion is not counted as money in
    ['41000000003', 'in', 4000],
  ]);
  expect(stored.reviewQueue).toEqual([]); // the bank-side withdrawal notice restates the bank pull
  expect(useSettings.getState().parsedWith).toBe(templatesRevision());

  const second = await syncInbox();
  expect(second).toEqual({ read: 0, added: 0, review: 0 });
});
