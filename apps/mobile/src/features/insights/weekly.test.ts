import type { Transaction } from '@/db/schema';
import { DEFAULT_CATEGORIES } from '@/features/categorization/defaultCategories';
import { upcomingSends, weeklyMessage, weekWindow } from './weekly';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const tx = (amountMinor: number, occurredAt: number, categoryId: string, direction: 'in' | 'out' = 'out'): Transaction => ({
  id: `${occurredAt}-${amountMinor}`, provider: 'mtn_momo', type: 'payment', direction, amountMinor, feeMinor: 0, taxMinor: 0, currency: 'GHS', occurredAt, categoryId, source: 'sms',
});

test('summaries go out on Sunday at 7 pm, the next ones after now', () => {
  // Tuesday 27 Oct 2026 → Sunday 1 Nov, then 8 Nov.
  expect(upcomingSends(new Date(at(2026, 10, 27, 10)), 2)).toEqual([at(2026, 11, 1, 19), at(2026, 11, 8, 19)]);
  // Sunday before 7 pm → that evening; after → next week.
  expect(upcomingSends(new Date(at(2026, 11, 1, 18)), 1)).toEqual([at(2026, 11, 1, 19)]);
  expect(upcomingSends(new Date(at(2026, 11, 1, 20)), 1)).toEqual([at(2026, 11, 8, 19)]);
});

test('the week runs from Monday morning to the Sunday evening it is sent', () => {
  expect(weekWindow(at(2026, 11, 1, 19))).toEqual({ start: at(2026, 10, 26, 0), end: at(2026, 11, 1, 19) });
});

test('says what was spent, where most went, the change from last week, money in, and budgets', () => {
  const sendAt = at(2026, 10, 25, 19);
  const data = {
    transactions: [tx(12000, at(2026, 10, 20), 'food'), tx(8000, at(2026, 10, 22), 'transport'), tx(5000, at(2026, 10, 23), 'income', 'in'), tx(25000, at(2026, 10, 14), 'food')],
    budgets: [{ categoryId: 'food', amountMinor: 30000 }],
    categories: DEFAULT_CATEGORIES,
  };
  expect(weeklyMessage(data, sendAt, 1, 'GHS')).toEqual({
    title: 'Your week: GHS 200.00 spent',
    body: 'Most on Food (GHS 120.00). GHS 50.00 less than last week. GHS 50.00 came in. Budgets: 1 over.',
  });
});

test('a quiet week says so', () => {
  expect(weeklyMessage({ transactions: [], budgets: [], categories: DEFAULT_CATEGORIES }, at(2026, 11, 1, 19), 1, 'GHS')).toEqual({
    title: 'Your week: nothing spent',
    body: 'No money moved through your wallets this week.',
  });
});
