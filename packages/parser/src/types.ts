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
  counterparty?: string; // fixed name when the message has none (e.g. interest credits)
  pattern: string;
  date_format?: string; // tokens: yyyy, yy, MM, dd, HH, mm, ss
}

export interface Provider {
  id: string;
  name: string;
  senderIds: string[];
  currency: string;
  // Messages from this sender that are not transactions (OTPs, promos, balance checks, failures).
  // Checked only after no template matched, so they never hide a real transaction.
  ignore?: string[];
  // Failed or declined transactions: no money moved, so they're dropped even though they carry a transaction ID.
  failed?: string[];
  // Messages that aren't transactions but tell us something about the wallet (see Evidence).
  evidence?: EvidenceRule[];
}

// Clues from non-transaction messages, used to explain balance gaps:
// - airtime_topup: the network's own "airtime recharged" notice; alone, it means the MoMo receipt never came
// - login: the wallet was opened (one-time code), so something may have been done without an SMS. The code itself
//   is never kept.
// Balance checks are deliberately not evidence: Telecel's can arrive an hour late, or count a transfer that later
// failed, so they'd invent gaps rather than explain them.
export type EvidenceKind = 'airtime_topup' | 'login';

export interface EvidenceRule {
  kind: EvidenceKind;
  pattern: string; // named group: amount (airtime_topup)
}

export interface Evidence {
  provider: string;
  kind: EvidenceKind;
  amountMinor?: number;
  at: number; // epoch ms
}

// 'ignored': a known non-transaction message. 'no_template_match': looks unknown, goes to the review queue.
export type ParseFailure = 'unknown_sender' | 'ignored' | 'no_template_match' | 'invalid';

export type ParseResult =
  | { ok: true; transaction: ParsedTransaction }
  | { ok: false; reason: ParseFailure; evidence?: Evidence };
