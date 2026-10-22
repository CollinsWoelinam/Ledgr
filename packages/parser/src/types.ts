export type TransactionType =
  | 'transfer_out'
  | 'transfer_in'
  | 'payment'
  | 'cash_out'
  | 'cash_in'
  | 'airtime_data'
  | 'reversal';

export type Direction = 'in' | 'out';

export interface RawSms {
  sender: string;
  body: string;
  receivedAt: number; // epoch ms
}

export interface ParsedTransaction {
  provider: string;
  templateVersion: number;
  type: TransactionType;
  direction: Direction;
  amountMinor: number;
  feeMinor: number;
  taxMinor: number;
  currency: string;
  counterpartyName?: string;
  counterpartyNumber?: string;
  balanceAfterMinor?: number;
  externalRef?: string;
  reversesRef?: string; // reversals: the original transaction's ref (FR-2.4)
  occurredAt: number; // epoch ms; falls back to receivedAt when the SMS has no date
}

/**
 * A named-group regex for one message format. Supported groups:
 * amount (required), currency, fee, tax, balance, name, number, ref, original_ref, date.
 * `{amount}` in a pattern expands to a money matcher, `{cur}` to a currency code.
 */
export interface Template {
  provider: string;
  version: number;
  type: TransactionType;
  direction?: Direction; // overrides the type's default direction
  pattern: string;
  date_format?: string; // tokens: yyyy, yy, MM, dd, HH, mm, ss
}

export interface Provider {
  id: string;
  name: string;
  senderIds: string[];
  currency: string;
}

export type ParseFailure = 'unknown_sender' | 'no_template_match' | 'invalid';

export type ParseResult =
  | { ok: true; transaction: ParsedTransaction }
  | { ok: false; reason: ParseFailure };
