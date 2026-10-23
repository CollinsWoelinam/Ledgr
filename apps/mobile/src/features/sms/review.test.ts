import { loadLedger } from '@/db/repositories/ledger';
import { addReviewItems } from '@/db/repositories/reviewQueue';
import { openTestDb } from '@/db/testing/nodeDb';
import type { ReviewItem } from '@/db/schema';
import { flushLedgerWrites, useLedger } from '@/state/ledger';
import { recheckReview, transactionIdIn } from './pipeline';
import { reviewHint } from './reviewHint';

const item = (id: string, body: string, receivedAt: number, sender = 'MobileMoney'): ReviewItem => ({ id, sender, body, receivedAt });
// Shaped like real messages from the phone (names and numbers made up).
const withdrawal = item('w', 'Withdrawal made from your bank account number: ****3401. Your Bank Balance:GHS 0.00. Your MM Balance: GHS 127.89. Transaction ID: 52991824765.', 1000);
const bankPull = item('b', 'You have received GHS 40.00 from ADB Bank Pull on your mobile money account at 2025-02-25 14:46:11. Message from sender: . Your new balance:GHS 127.89. Financial Transaction Id: 52991824765.', 1001);
const failed = item('f', 'Your payment of GHS 80.00 to TELECEL PUSH has failed at 2026-03-05 13:17:06. Reference: x. Financial Transaction Id: 76550405509.', 1002);
const voucher = item('v', 'Your voucher 4471902 with GHS 20.00 has expired. Your new balance is GHS 430.20 Financial Transaction Id: 72015583955.', 1003);
const readable = item('r', 'Your payment of GHS 10.00 to MTN AIRTIME has been completed at 2026-10-20 09:15:03. Your new balance: GHS 110.50. Fee was GHS 0.00 Tax was GHS 0.00. Reference: -. Financial Transaction Id: 41234567893.', 1004);

test('finds the transaction ID a message quotes', () => {
  expect(transactionIdIn(withdrawal.body)).toBe('52991824765');
  expect(transactionIdIn('no id here')).toBeUndefined();
});

test('recheck: one card per transaction ID (newest kept), failed dropped, readable ones become transactions', () => {
  const { keep, transactions } = recheckReview([withdrawal, bankPull, failed, voucher, readable], new Set());
  expect(keep.map((r) => r.id)).toEqual(['v', 'b']);
  expect(transactions.map((t) => t.externalRef)).toEqual(['41234567893']);
});

test('recheck: of two messages about one transaction, the one stating an amount is kept, even if older', () => {
  const laterWithdrawal = { ...withdrawal, receivedAt: 5000 };
  expect(recheckReview([laterWithdrawal, bankPull], new Set()).keep.map((r) => r.id)).toEqual(['b']);
});

test('recheck: a message about an already stored transaction is dropped', () => {
  expect(recheckReview([voucher], new Set(['72015583955'])).keep).toEqual([]);
});

test('the ledger re-checks the stored queue on launch and saves the result', async () => {
  const db = await openTestDb();
  const { ensureDefaults } = await import('@/db/repositories/ledger');
  await ensureDefaults(db);
  await addReviewItems(db, [withdrawal, bankPull, failed, voucher, readable]);
  await useLedger.getState().attach(db, false);
  await flushLedgerWrites();
  const stored = await loadLedger(db);
  expect(stored.reviewQueue.map((r) => r.id).sort()).toEqual(['b', 'v']);
  expect(stored.transactions.map((t) => t.externalRef)).toEqual(['41234567893']);
});

test('clear all empties the queue', async () => {
  const db = await openTestDb();
  await addReviewItems(db, [voucher, bankPull]);
  await useLedger.getState().attach(db, false);
  useLedger.getState().clearReview();
  await flushLedgerWrites();
  expect((await loadLedger(db)).reviewQueue).toEqual([]);
});

test('hints: wallet name, a guess at the kind, and the amount', () => {
  expect(reviewHint('MobileMoney', bankPull.body)).toEqual({ wallet: 'MTN MoMo', kind: 'Bank transfer', amount: 'GHS 40.00' });
  // Its only amounts are balances, so no amount is shown rather than a wrong one.
  expect(reviewHint('MobileMoney', withdrawal.body)).toEqual({ wallet: 'MTN MoMo', kind: 'Bank withdrawal', amount: undefined });
  expect(reviewHint('MobileMoney', 'Token: 975087195225 of 5.00 GHS for 233550013743 with expiry date 2023/09/15 has not been used as yet.')).toMatchObject({ amount: 'GHS 5.00' });
  expect(reviewHint('MobileMoney', voucher.body)).toMatchObject({ kind: 'Expired voucher', amount: 'GHS 20.00' });
  expect(reviewHint('MobileMoney', 'Payment made for GHS 5.00 to X Current Balance: - GHS 2.00 .')).toMatchObject({ kind: 'Payment on credit' });
  expect(reviewHint('T-CASH', 'Something odd')).toEqual({ wallet: 'Telecel Cash', kind: 'Unrecognised message', amount: undefined });
});
