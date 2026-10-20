export type TransactionType =
  | 'transfer_out'
  | 'transfer_in'
  | 'payment'
  | 'cash_out'
  | 'cash_in'
  | 'airtime_data'
  | 'reversal';

export interface RawSms {
  sender: string;
  body: string;
  receivedAt: number; // epoch ms
}

export interface ParsedTransaction {
  provider: string;
  templateVersion: number;
  type: TransactionType;
  direction: 'in' | 'out';
  amountMinor: number;
  feeMinor: number;
  taxMinor: number;
  currency: string;
  counterpartyName?: string;
  counterpartyNumber?: string;
  balanceAfterMinor?: number;
  externalRef?: string;
  occurredAt: number; // epoch ms
}

export interface Template {
  provider: string;
  version: number;
  type: TransactionType;
  pattern: string; // named-group regex
  date_format?: string;
}

export interface Provider {
  id: string;
  name: string;
  senderIds: string[];
  currency: string;
}

export type ParseResult =
  | { ok: true; transaction: ParsedTransaction }
  | { ok: false; reason: 'unknown_sender' | 'no_template_match' | 'invalid' };
