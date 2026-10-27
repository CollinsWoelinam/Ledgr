import type { Budget, Category, Transaction } from '@/db/schema';
import { elapsedRatio, paceStatus, type PaceStatus } from '@/features/budgets/pace';
import { periodContaining, type Period } from '@/features/budgets/period';
import { budgetProgress } from '@/features/budgets/progress';
import { formatMoney } from '@/lib/format';
import { spendByCategory, summarize } from './queries';

// US-15: a weekly summary, Sundays at 7 pm, covering Monday to then.

const SEND_HOUR = 19;
const DAY = 86_400_000;

// The next `count` Sundays at 7 pm after `now`.
export function upcomingSends(now: Date, count: number): number[] {
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7), SEND_HOUR);
  if (first.getTime() <= now.getTime()) first.setDate(first.getDate() + 7);
  return Array.from({ length: count }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7 * i, SEND_HOUR).getTime());
}

// Monday 00:00 of the week that ends at `sendAt` (a Sunday evening), up to `sendAt`.
export function weekWindow(sendAt: number): Period {
  const end = new Date(sendAt);
  return { start: new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6).getTime(), end: sendAt };
}

const STATUS_WORDS: [PaceStatus, string][] = [
  ['over', 'over'],
  ['nearly', 'nearly used up'],
  ['ahead', 'ahead of pace'],
  ['onPace', 'on pace'],
];

export function weeklyMessage(data: { transactions: Transaction[]; budgets: Budget[]; categories: Category[] }, sendAt: number, monthStartDay: number, currency: string): { title: string; body: string } {
  const money = (minor: number) => formatMoney(minor, currency);
  const week = weekWindow(sendAt);
  const lastWeek = { start: week.start - 7 * DAY, end: week.start };
  const { outMinor, inMinor } = summarize(data.transactions, week);
  const before = summarize(data.transactions, lastWeek).outMinor;
  const parts: string[] = [];

  const [top] = spendByCategory(data.transactions, week);
  if (top) parts.push(`Most on ${data.categories.find((c) => c.id === top.categoryId)?.name ?? 'Other'} (${money(top.amountMinor)})`);
  if (outMinor > 0 && before > 0 && outMinor !== before) parts.push(`${money(Math.abs(outMinor - before))} ${outMinor > before ? 'more' : 'less'} than last week`);
  if (inMinor > 0) parts.push(`${money(inMinor)} came in`);

  const month = periodContaining(new Date(sendAt - 1), monthStartDay);
  const statuses = budgetProgress(data.budgets, data.transactions, month).map((p) => paceStatus(p, elapsedRatio(month, sendAt)));
  const counts = STATUS_WORDS.map(([s, words]) => [statuses.filter((x) => x === s).length, words] as const).filter(([n]) => n > 0);
  if (counts.length) parts.push(`Budgets: ${counts.map(([n, words]) => `${n} ${words}`).join(', ')}`);

  return {
    title: outMinor > 0 ? `Your week: ${money(outMinor)} spent` : 'Your week: nothing spent',
    body: parts.length ? `${parts.join('. ')}.` : 'No money moved through your wallets this week.',
  };
}
