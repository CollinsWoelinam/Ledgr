import { bundledConfig, dedupeKey, parseSms, type EngineConfig } from '@ledgr/parser';
import type { ReviewItem, Transaction } from '@/db/schema';
import type { InboxSms } from '../../../modules/ledgr-sms';

export type Incoming = Omit<Transaction, 'categoryId'>;

export interface Classified {
  transactions: Incoming[];
  review: ReviewItem[];
  ignored: number;
}

// Steps 2–7: parse each message; known non-transactions are dropped, unknown wallet messages go to review (FR-2.5).
// Categorizing and saving happen in the ledger, which also drops duplicates (FR-2.3).
export function classify(messages: InboxSms[], config: EngineConfig = bundledConfig): Classified {
  const out: Classified = { transactions: [], review: [], ignored: 0 };
  for (const m of messages) {
    const result = parseSms({ sender: m.sender, body: m.body, receivedAt: m.receivedAt }, config);
    if (result.ok) {
      const { templateVersion: _v, ...tx } = result.transaction;
      out.transactions.push({ ...tx, id: dedupeKey(result.transaction), source: 'sms', smsBody: m.body });
    } else if (result.reason === 'no_template_match' || result.reason === 'invalid') {
      out.review.push({ id: `sms-${m.id}`, sender: m.sender, body: m.body, receivedAt: m.receivedAt });
    } else {
      out.ignored++;
    }
  }
  return out;
}

// Senders to read for the wallets the user picked.
export function sendersFor(providerIds: string[], config: EngineConfig = bundledConfig): string[] {
  return config.providers.filter((p) => providerIds.includes(p.id)).flatMap((p) => p.senderIds);
}
