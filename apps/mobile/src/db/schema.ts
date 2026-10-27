import type { Evidence, ParsedTransaction } from '@ledgr/parser';

// TypeScript mirrors of migrations/*.sql. All money is integer minor units.

export interface Transaction extends Omit<ParsedTransaction, 'templateVersion'> {
  id: string;
  categoryId: string;
  source: 'sms' | 'manual' | 'demo';
  smsBody?: string; // kept on-device only, for the detail screen
  business?: true; // marked as business money (US-14); otherwise personal
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Ionicons name
  color: string;
  kind: 'expense' | 'income';
  isDefault: boolean;
}

export type RuleMatch = 'counterparty' | 'keyword' | 'type';

export interface CategoryRule {
  id: string;
  matchType: RuleMatch;
  pattern: string;
  categoryId: string;
  priority: number;
  createdBy: 'user' | 'system';
}

export interface Budget {
  categoryId: string | null; // null = overall
  amountMinor: number;
}

export interface ReviewItem {
  id: string;
  sender: string;
  body: string;
  receivedAt: number;
}

// A clue from a non-transaction wallet message (see Evidence in the parser).
export interface StoredEvidence extends Evidence {
  id: string;
}
