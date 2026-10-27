import type { Transaction } from '@/db/schema';
import { DEFAULT_CATEGORIES } from '@/features/categorization/defaultCategories';
import { inScope, toCsv, toStatementHtml } from './format';

const at = (d: number, h = 9) => new Date(2026, 9, d, h, 5).getTime();
const tx = (over: Partial<Transaction>): Transaction => ({
  id: String(Math.random()), provider: 'mtn_momo', type: 'payment', direction: 'out', amountMinor: 1000, feeMinor: 0, taxMinor: 0, currency: 'GHS', occurredAt: at(10), categoryId: 'food', source: 'sms', ...over,
});
const scope = { period: { start: at(1, 0), end: at(31, 23) }, label: 'October 2026', wallets: null };

test('CSV: one row per transaction, signed amounts, readable values', () => {
  const csv = toCsv([tx({ counterpartyName: 'KFC OSU', amountMinor: 4550, feeMinor: 25, externalRef: '123', balanceAfterMinor: 10000 }), tx({ direction: 'in', categoryId: 'income', amountMinor: 20000, provider: 'cash', source: 'manual', business: true })], DEFAULT_CATEGORIES);
  const [header, first, second] = csv.replace('﻿', '').trim().split('\r\n');
  expect(header).toBe('Date,Time,Wallet,Direction,Counterparty,Number,Category,Business,Amount,Fee,E-levy,Balance after,Transaction ID,Source');
  expect(first).toBe('2026-10-10,09:05,MTN MoMo,Out,KFC OSU,,Food,No,-45.50,0.25,0.00,100.00,123,SMS');
  expect(second).toBe('2026-10-10,09:05,Cash,In,,,Income,Yes,200.00,0.00,0.00,,,Added by you');
});

test('CSV: commas and quotes are escaped, and names cannot run as spreadsheet formulas', () => {
  const csv = toCsv([tx({ counterpartyName: 'Mensah, "Big K"' }), tx({ counterpartyName: '=HYPERLINK("x")' })], DEFAULT_CATEGORIES);
  expect(csv).toContain(',"Mensah, ""Big K""",');
  expect(csv).toContain(`,"'=HYPERLINK(""x"")",`);
});

test('scope: only the period and wallets asked for, oldest first', () => {
  const data = [tx({ id: 'late', occurredAt: at(20) }), tx({ id: 'early', occurredAt: at(2) }), tx({ id: 'telecel', provider: 'telecel_cash' }), tx({ id: 'sept', occurredAt: new Date(2026, 8, 30).getTime() })];
  expect(inScope(data, scope).map((t) => t.id)).toEqual(['early', 'telecel', 'late']);
  expect(inScope(data, { ...scope, wallets: ['telecel_cash'] }).map((t) => t.id)).toEqual(['telecel']);
});

test('PDF statement: totals, categories, rows, and names are escaped', () => {
  const page = toStatementHtml([tx({ counterpartyName: '<script>x</script>', amountMinor: 4550 })], DEFAULT_CATEGORIES, scope, 'GHS');
  expect(page).toContain('Money out<b>GHS 45.50</b>');
  expect(page).toContain('&lt;script&gt;x&lt;/script&gt;');
  expect(page).not.toContain('<script>');
});
