import { bundledConfig, dedupeKey, parseSms, type EngineConfig, type ParsedTransaction } from '@ledgr/parser';
import type { ReviewItem, StoredEvidence, Transaction } from '@/db/schema';
import type { InboxSms } from '../../../modules/ledgr-sms';
import { amountIn } from './reviewHint';

export type Incoming = Omit<Transaction, 'categoryId'>;

export interface Classified {
  transactions: Incoming[];
  review: ReviewItem[];
  evidence: StoredEvidence[];
  ignored: number;
}

// Steps 2–7: parse each message; known non-transactions are dropped, unknown wallet messages go to review (FR-2.5).
// Categorizing and saving happen in the ledger, which also drops duplicates (FR-2.3).
export function classify(messages: InboxSms[], config: EngineConfig = bundledConfig): Classified {
  const out: Classified = { transactions: [], review: [], evidence: [], ignored: 0 };
  for (const m of messages) {
    const result = parseSms({ sender: m.sender, body: m.body, receivedAt: m.receivedAt }, config);
    if (result.ok) {
      out.transactions.push(toIncoming(result.transaction, m.body));
    } else if (result.reason === 'no_template_match' || result.reason === 'invalid') {
      out.review.push({ id: `sms-${m.id}`, sender: m.sender, body: m.body, receivedAt: m.receivedAt });
    } else {
      out.ignored++;
      if (result.evidence) out.evidence.push({ ...result.evidence, id: `ev-${m.id}` });
    }
  }
  return out;
}

// Senders to read for the wallets the user picked.
export function sendersFor(providerIds: string[], config: EngineConfig = bundledConfig): string[] {
  return config.providers.filter((p) => providerIds.includes(p.id)).flatMap((p) => p.senderIds);
}

function toIncoming(parsed: ParsedTransaction, body: string): Incoming {
  const { templateVersion: _v, ...tx } = parsed;
  return { ...tx, id: dedupeKey(parsed), source: 'sms', smsBody: body };
}

// The provider's transaction ID quoted in a message, if any ("Transaction ID: 52991824765").
export function transactionIdIn(body: string): string | undefined {
  return /Transaction I[dD]:? ?(\d{6,})/.exec(body)?.[1];
}

// Re-checks the review queue with the current templates: messages that now parse become transactions, known
// non-transactions (failed, promos) leave, and several messages about one transaction ID keep one: the one that
// states an amount, else the newest.
// Runs on every launch, so template improvements clear old review items without the user doing anything.
export function recheckReview(items: ReviewItem[], knownRefs: Set<string>, config: EngineConfig = bundledConfig): { keep: ReviewItem[]; transactions: Incoming[] } {
  const keep: ReviewItem[] = [];
  const transactions: Incoming[] = [];
  const pending: ReviewItem[] = [];
  const seen = new Set(knownRefs);
  // First pass: what the parser can now read becomes a transaction, so its companions can be recognised below.
  for (const item of items) {
    const result = parseSms({ sender: item.sender, body: item.body, receivedAt: item.receivedAt }, config);
    if (result.ok) {
      transactions.push(toIncoming(result.transaction, item.body));
      if (result.transaction.externalRef) seen.add(result.transaction.externalRef);
    } else if (result.reason !== 'ignored') {
      pending.push(item);
    }
  }
  const informative = (r: ReviewItem) => (amountIn(r.body) ? 1 : 0);
  for (const item of pending.sort((a, b) => informative(b) - informative(a) || b.receivedAt - a.receivedAt)) {
    const id = transactionIdIn(item.body);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    keep.push(item);
  }
  return { keep, transactions };
}
