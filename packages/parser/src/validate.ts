import type { ParsedTransaction } from './types';

// Step 6: amounts must be sane; balance consistency is checked by the app against the previous transaction.
export function isValid(tx: ParsedTransaction): boolean {
  const nonNegative = (n: number | undefined) => n === undefined || (Number.isInteger(n) && n >= 0);
  return (
    Number.isInteger(tx.amountMinor) &&
    tx.amountMinor > 0 &&
    nonNegative(tx.feeMinor) &&
    nonNegative(tx.taxMinor) &&
    nonNegative(tx.balanceAfterMinor) &&
    Number.isFinite(tx.occurredAt)
  );
}
