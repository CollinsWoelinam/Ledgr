import type { ParsedTransaction } from '@ledgr/parser';

// FR-3.2 rule order: user rules → counterparty memory → keyword rules → type default.
export function categorize(_tx: ParsedTransaction): string {
  return 'other';
}
