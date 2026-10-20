import type { ParsedTransaction } from './types';

// Step 6: amount > 0; balance consistency is checked by the app against the previous transaction.
export function isValid(tx: ParsedTransaction): boolean {
  return tx.amountMinor > 0 && tx.feeMinor >= 0 && tx.taxMinor >= 0;
}
