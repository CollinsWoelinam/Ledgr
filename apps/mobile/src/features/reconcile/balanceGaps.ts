import type { Transaction } from '@/db/schema';

// Money that moved without an SMS explaining it. Each wallet message reports the new balance, so walking a
// wallet's transactions in order, every reported balance should equal the previous one plus what happened since.
// When it doesn't, something moved that no message accounts for: that difference is a gap.

export interface BalanceGap {
  key: string; // stable: the two transactions it sits between
  provider: string;
  amountMinor: number; // signed: positive means unexplained money in, negative unexplained money out
  from: number; // the transaction before the gap (epoch ms)
  to: number; // the transaction that revealed it
}

const TOLERANCE_MINOR = 1; // a pesewa of rounding
const NETTING_MS = 24 * 3600_000; // gaps that cancel out within a day are late SMS, not missing money
const CLUSTER_MS = 30 * 60_000; // transactions this close together may have been texted out of order
const MAX_PERMUTE = 6; // 720 orders; larger clusters keep their time order

const delta = (t: Transaction) => (t.direction === 'in' ? t.amountMinor : -t.amountMinor) - t.feeMinor - t.taxMinor;

// Mismatches when walking `seq` from a known balance. Transactions without a reported balance (manual entries,
// recorded gaps) just move the running balance.
function mismatches(start: number | undefined, seq: Transaction[]): number {
  let running = start;
  let bad = 0;
  for (const t of seq) {
    if (running !== undefined) running += delta(t);
    if (t.balanceAfterMinor !== undefined) {
      if (running !== undefined && Math.abs(running - t.balanceAfterMinor) > TOLERANCE_MINOR) bad++;
      running = t.balanceAfterMinor;
    }
  }
  return bad;
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

// Time order, except that within a burst of close transactions the order whose balances agree wins.
export function orderByBalance(transactions: Transaction[]): Transaction[] {
  const sorted = [...transactions].sort((a, b) => a.occurredAt - b.occurredAt);
  const out: Transaction[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sorted[j]!.occurredAt - sorted[j - 1]!.occurredAt <= CLUSTER_MS) j++;
    const cluster = sorted.slice(i, j);
    if (cluster.length > 1 && cluster.length <= MAX_PERMUTE) {
      const start = [...out].reverse().find((t) => t.balanceAfterMinor !== undefined);
      const anchor = start ? runningAfter(out, start) : undefined;
      let best = cluster;
      let bestScore = mismatches(anchor, cluster);
      for (const p of permutations(cluster)) {
        if (bestScore === 0) break;
        const score = mismatches(anchor, p);
        if (score < bestScore) {
          best = p;
          bestScore = score;
        }
      }
      out.push(...best);
    } else {
      out.push(...cluster);
    }
    i = j;
  }
  return out;
}

// The running balance at the end of `seq`, starting from its last reported balance.
function runningAfter(seq: Transaction[], lastWithBalance: Transaction): number {
  let running = lastWithBalance.balanceAfterMinor!;
  for (let k = seq.indexOf(lastWithBalance) + 1; k < seq.length; k++) running += delta(seq[k]!);
  return running;
}

export function findBalanceGaps(transactions: Transaction[]): BalanceGap[] {
  const byWallet = new Map<string, Transaction[]>();
  for (const t of transactions) byWallet.set(t.provider, [...(byWallet.get(t.provider) ?? []), t]);

  const gaps: BalanceGap[] = [];
  for (const [provider, list] of byWallet) {
    const walletGaps: BalanceGap[] = [];
    let running: number | undefined;
    let last: Transaction | undefined;
    for (const t of orderByBalance(list)) {
      if (running !== undefined) running += delta(t);
      if (t.balanceAfterMinor !== undefined) {
        if (running !== undefined && last && Math.abs(running - t.balanceAfterMinor) > TOLERANCE_MINOR) {
          walletGaps.push({
            key: `${last.id}>${t.id}`,
            provider,
            amountMinor: t.balanceAfterMinor - running,
            from: Math.min(last.occurredAt, t.occurredAt),
            to: Math.max(last.occurredAt, t.occurredAt),
          });
        }
        running = t.balanceAfterMinor;
      }
      last = t;
    }
    gaps.push(...netOut(walletGaps));
  }
  return gaps.sort((a, b) => b.to - a.to);
}

// SMS delivered hours late leave a run of gaps that add up to nothing (+302, −753, +451): no money is missing.
// Drop any run of consecutive gaps, within a day of each other, whose amounts cancel.
function netOut(gaps: BalanceGap[]): BalanceGap[] {
  const out: BalanceGap[] = [];
  let i = 0;
  while (i < gaps.length) {
    let sum = 0;
    let end = -1;
    for (let j = i; j < gaps.length && gaps[j]!.to - gaps[i]!.from <= NETTING_MS; j++) {
      sum += gaps[j]!.amountMinor;
      if (j > i && Math.abs(sum) <= TOLERANCE_MINOR) end = j;
    }
    if (end >= 0) {
      i = end + 1;
    } else {
      out.push(gaps[i]!);
      i++;
    }
  }
  return out;
}
