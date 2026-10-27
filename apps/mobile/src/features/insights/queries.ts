import type { Transaction } from '@/db/schema';
import { inPeriod, type Period } from '@/features/budgets/period';
import { drawDownCash } from '@/features/cash/pocket';

export interface PeriodSummary {
  outMinor: number;
  inMinor: number;
  feesMinor: number; // fees + taxes/levies
  count: number;
}

// Every outflow counts as spending, bank transfers and cash withdrawals included: once money leaves the wallet,
// it's spent (decided 2026-10-23). Cash you record re-sorts withdrawals rather than adding to them (see drawDownCash).
export function summarize(transactions: Transaction[], period: Period): PeriodSummary {
  const s: PeriodSummary = { outMinor: 0, inMinor: 0, feesMinor: 0, count: 0 };
  for (const t of drawDownCash(transactions)) {
    if (!inPeriod(t.occurredAt, period)) continue;
    if (t.amountMinor === 0 && t.feeMinor + t.taxMinor === 0) continue; // a withdrawal fully re-sorted
    s.count += 1;
    if (t.direction === 'out') s.outMinor += t.amountMinor;
    else s.inMinor += t.amountMinor;
    s.feesMinor += t.feeMinor + t.taxMinor;
  }
  return s;
}

// Money across all wallets: each wallet's most recently reported balance, added up.
// (One wallet's SMS says nothing about another's balance.)
export function latestBalance(transactions: Transaction[]): number | undefined {
  const latest = new Map<string, Transaction>();
  for (const t of transactions) {
    if (t.balanceAfterMinor === undefined) continue;
    const best = latest.get(t.provider);
    if (!best || t.occurredAt > best.occurredAt) latest.set(t.provider, t);
  }
  if (latest.size === 0) return undefined;
  return [...latest.values()].reduce((sum, t) => sum + t.balanceAfterMinor!, 0);
}

export function spendByCategory(transactions: Transaction[], period: Period): { categoryId: string; amountMinor: number }[] {
  const totals = new Map<string, number>();
  for (const t of drawDownCash(transactions)) {
    if (t.direction !== 'out' || !inPeriod(t.occurredAt, period)) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amountMinor);
  }
  return [...totals].filter(([, amountMinor]) => amountMinor > 0).map(([categoryId, amountMinor]) => ({ categoryId, amountMinor })).sort((a, b) => b.amountMinor - a.amountMinor);
}

export function dailySpend(transactions: Transaction[], period: Period): { day: number; amountMinor: number }[] {
  const days: { day: number; amountMinor: number }[] = [];
  for (let d = new Date(period.start); d.getTime() < period.end; d.setDate(d.getDate() + 1)) {
    days.push({ day: d.getTime(), amountMinor: 0 });
  }
  for (const t of drawDownCash(transactions)) {
    if (t.direction !== 'out' || !inPeriod(t.occurredAt, period)) continue;
    const idx = days.findIndex((d, i) => t.occurredAt >= d.day && (i === days.length - 1 || t.occurredAt < days[i + 1]!.day));
    if (idx >= 0) days[idx]!.amountMinor += t.amountMinor;
  }
  return days;
}

export function topCounterparties(transactions: Transaction[], period: Period, limit = 5): { name: string; amountMinor: number; count: number }[] {
  const totals = new Map<string, { amountMinor: number; count: number }>();
  for (const t of drawDownCash(transactions)) {
    if (t.direction !== 'out' || !t.counterpartyName || !inPeriod(t.occurredAt, period)) continue;
    const entry = totals.get(t.counterpartyName) ?? { amountMinor: 0, count: 0 };
    entry.amountMinor += t.amountMinor;
    entry.count += 1;
    totals.set(t.counterpartyName, entry);
  }
  return [...totals].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amountMinor - a.amountMinor).slice(0, limit);
}
