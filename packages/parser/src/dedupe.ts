import type { ParsedTransaction } from './types';

// FR-2.3: external_ref first, then a hash of amount + time + counterparty.
export function dedupeKey(tx: ParsedTransaction): string {
  if (tx.externalRef) return `${tx.provider}:ref:${tx.externalRef}`;
  return `${tx.provider}:h:${tx.amountMinor}:${tx.occurredAt}:${tx.counterpartyNumber ?? tx.counterpartyName ?? ''}`;
}
