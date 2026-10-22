import type { ParsedTransaction } from './types';

// FR-2.3: external_ref first, then a hash of amount + time + counterparty.
// Reversals carry the original's ref, so they get their own key space.
export function dedupeKey(tx: ParsedTransaction): string {
  if (tx.externalRef) return `${tx.provider}:ref:${tx.externalRef}`;
  if (tx.reversesRef) return `${tx.provider}:rev:${tx.reversesRef}`;
  return `${tx.provider}:h:${tx.amountMinor}:${tx.occurredAt}:${tx.counterpartyNumber ?? tx.counterpartyName ?? ''}`;
}
