import type { TransactionType } from '@ledgr/parser';
import { create } from 'zustand';
import * as budgetsRepo from '@/db/repositories/budgets';
import * as categoriesRepo from '@/db/repositories/categories';
import * as evidenceRepo from '@/db/repositories/evidence';
import * as gapsRepo from '@/db/repositories/gaps';
import { ensureDefaults, loadLedger, wipeLedger } from '@/db/repositories/ledger';
import * as reviewRepo from '@/db/repositories/reviewQueue';
import * as transactionsRepo from '@/db/repositories/transactions';
import type { Budget, Category, CategoryRule, ReviewItem, StoredEvidence, Transaction } from '@/db/schema';
import type { SqlDb } from '@/db/sql';
import { seedDemoData } from '@/demo/seed';
import { recheckReview, transactionIdIn, type Incoming } from '@/features/sms/pipeline';
import { categorize, counterpartyKey } from '@/features/categorization/categorize';
import type { BalanceGap } from '@/features/reconcile/balanceGaps';
import { DEFAULT_CATEGORIES, SYSTEM_RULES } from '@/features/categorization/defaultCategories';

// The UI reads this in-memory copy; every action also writes through to the database (when one is attached).
export interface LedgerState {
  transactions: Transaction[];
  categories: Category[];
  rules: CategoryRule[];
  budgets: Budget[];
  reviewQueue: ReviewItem[];
  dismissedGaps: string[];
  evidence: StoredEvidence[];
  ready: boolean;
  encrypted: boolean;
  attach: (db: SqlDb, encrypted: boolean) => Promise<void>;
  loadDemo: () => void;
  ingest: (incoming: Incoming[], review: ReviewItem[], evidence?: StoredEvidence[]) => { added: number; reviewAdded: number };
  recheckReview: () => void;
  ignoreGap: (key: string) => void;
  recordGap: (gap: BalanceGap, details?: { name?: string; categoryId?: string; at?: number; type?: TransactionType; feeMinor?: number }) => void;
  clearReview: () => void;
  setCategory: (transactionId: string, categoryId: string, applyToCounterparty: boolean) => number;
  setBudget: (categoryId: string | null, amountMinor: number | null) => void;
  addCategory: (category: Omit<Category, 'id' | 'isDefault'>) => void;
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'color' | 'icon'>>) => void;
  deleteCategory: (id: string) => void;
  dismissReview: (id: string) => void;
  reset: () => void;
}

const DEMO_BUDGETS: Budget[] = [
  { categoryId: null, amountMinor: 300000 },
  { categoryId: 'food', amountMinor: 60000 },
  { categoryId: 'transport', amountMinor: 40000 },
  { categoryId: 'airtime', amountMinor: 15000 },
  { categoryId: 'shopping', amountMinor: 50000 },
];

const empty = { transactions: [], categories: DEFAULT_CATEGORIES, rules: SYSTEM_RULES, budgets: [], reviewQueue: [], dismissedGaps: [] as string[], evidence: [] as StoredEvidence[] };

let db: SqlDb | null = null;
let writes: Promise<void> = Promise.resolve();

// Writes run one after another, in the order actions happened. A failed write is logged and doesn't block later ones.
function persist(task: (db: SqlDb) => Promise<unknown>): void {
  const target = db;
  if (!target) return;
  writes = writes.then(() => task(target)).then(
    () => undefined,
    (e) => console.error('[ledger] write failed', e),
  );
}

// Resolves once every queued write has reached the database.
export function flushLedgerWrites(): Promise<void> {
  return writes;
}

export const useLedger = create<LedgerState>()((set, get) => ({
  ...empty,
  ready: false,
  encrypted: false,

  attach: async (database, encrypted) => {
    db = database;
    await ensureDefaults(database);
    set({ ...(await loadLedger(database)), encrypted, ready: true });
    get().recheckReview();
  },

  loadDemo: () => {
    const { transactions, reviewQueue } = seedDemoData();
    const rules = SYSTEM_RULES;
    const categorized = transactions.map((t) => ({ ...t, categoryId: categorize(t, rules) }));
    set({ transactions: categorized, categories: DEFAULT_CATEGORIES, rules, budgets: DEMO_BUDGETS, reviewQueue });
    persist(async (d) => {
      await wipeLedger(d);
      await transactionsRepo.insertTransactions(d, categorized);
      await reviewRepo.addReviewItems(d, reviewQueue);
      for (const b of DEMO_BUDGETS) await budgetsRepo.setBudget(d, b.categoryId, b.amountMinor);
    });
  },

  // New SMS transactions: drop ones already stored (ids are dedupe keys, FR-2.3), categorize, save.
  ingest: (incoming, review, evidence = []) => {
    const { transactions, rules, reviewQueue, categories } = get();
    const knownEvidence = new Set(get().evidence.map((e) => e.id));
    const newEvidence = evidence.filter((e) => !knownEvidence.has(e.id));
    if (newEvidence.length) {
      set({ evidence: [...get().evidence, ...newEvidence].sort((a, b) => a.at - b.at) });
      persist((d) => evidenceRepo.addEvidence(d, newEvidence));
    }
    const known = new Set(transactions.map((t) => t.id));
    // A rule or default can name a category the user has since deleted; those land in Other.
    const present = new Set(categories.map((c) => c.id));
    const fresh: Transaction[] = [];
    for (const t of incoming) {
      if (known.has(t.id)) continue;
      known.add(t.id);
      const categoryId = categorize(t, rules);
      fresh.push({ ...t, categoryId: present.has(categoryId) ? categoryId : 'other' });
    }
    const knownReview = new Set(reviewQueue.map((r) => r.id));
    const knownRefs = new Set([...transactions, ...fresh].map((t) => t.externalRef).filter((r): r is string => !!r));
    const reviewRefs = new Set(reviewQueue.map((r) => transactionIdIn(r.body)).filter((r): r is string => !!r));
    // A message about a transaction already stored, or already waiting for review, adds nothing.
    const newReview = recheckReview(
      review.filter((r) => !knownReview.has(r.id)),
      new Set([...knownRefs, ...reviewRefs]),
    ).keep;
    if (fresh.length === 0 && newReview.length === 0) return { added: 0, reviewAdded: 0 };

    set({
      transactions: [...fresh, ...transactions].sort((a, b) => b.occurredAt - a.occurredAt),
      reviewQueue: [...newReview, ...reviewQueue].sort((a, b) => b.receivedAt - a.receivedAt),
    });
    persist(async (d) => {
      if (fresh.length) await transactionsRepo.insertTransactions(d, fresh);
      if (newReview.length) await reviewRepo.addReviewItems(d, newReview);
    });
    return { added: fresh.length, reviewAdded: newReview.length };
  },

  recheckReview: () => {
    const { reviewQueue, transactions } = get();
    if (reviewQueue.length === 0) return;
    const knownRefs = new Set(transactions.map((t) => t.externalRef).filter((r): r is string => !!r));
    const { keep, transactions: parsed } = recheckReview(reviewQueue, knownRefs);
    const kept = new Set(keep.map((r) => r.id));
    const dropped = reviewQueue.filter((r) => !kept.has(r.id));
    if (dropped.length === 0) return;
    set({ reviewQueue: keep });
    persist(async (d) => {
      for (const r of dropped) await reviewRepo.removeReviewItem(d, r.id);
    });
    if (parsed.length) get().ingest(parsed, []);
  },

  ignoreGap: (key) => {
    if (get().dismissedGaps.includes(key)) return;
    set({ dismissedGaps: [...get().dismissedGaps, key] });
    persist((d) => gapsRepo.dismissGap(d, key));
  },

  // Records the change as a transaction inside the gap (no balance of its own, so it closes the gap), named and
  // categorised by the user when they know what it was. Money out counts as spending like any other outflow.
  // A guessed fee is split out so it shows under fees; amount + fee is always exactly the gap.
  recordGap: (gap, details = {}) => {
    const out = gap.amountMinor < 0;
    const id = `manual:gap:${gap.key}`;
    const feeMinor = out ? Math.min(details.feeMinor ?? 0, Math.abs(gap.amountMinor)) : 0;
    get().ingest(
      [
        {
          id,
          provider: gap.provider,
          type: details.type ?? (out ? 'payment' : 'transfer_in'),
          direction: out ? 'out' : 'in',
          amountMinor: Math.abs(gap.amountMinor) - feeMinor,
          feeMinor,
          taxMinor: 0,
          currency: 'GHS',
          counterpartyName: details.name?.trim() || 'Missing SMS',
          occurredAt: details.at ?? Math.round((gap.from + gap.to) / 2),
          source: 'manual',
        },
      ],
      [],
    );
    if (details.categoryId) get().setCategory(id, details.categoryId, false);
  },

  clearReview: () => {
    const ids = get().reviewQueue.map((r) => r.id);
    set({ reviewQueue: [] });
    persist(async (d) => {
      for (const id of ids) await reviewRepo.removeReviewItem(d, id);
    });
  },

  // FR-3.3: "apply to all from this counterparty" saves a user rule and re-categorizes matches. Returns how many changed.
  setCategory: (transactionId, categoryId, applyToCounterparty) => {
    const { transactions, rules } = get();
    const target = transactions.find((t) => t.id === transactionId);
    const key = target && counterpartyKey(target);
    if (!target) return 0;

    if (!applyToCounterparty || !key) {
      set({ transactions: transactions.map((t) => (t.id === transactionId ? { ...t, categoryId } : t)) });
      persist((d) => transactionsRepo.setTransactionCategory(d, [transactionId], categoryId));
      return 1;
    }

    const rule: CategoryRule = { id: `user-${key}`, matchType: 'counterparty', pattern: key, categoryId, priority: 0, createdBy: 'user' };
    const changed: string[] = [];
    set({
      rules: [rule, ...rules.filter((r) => r.id !== rule.id)],
      transactions: transactions.map((t) => {
        if (counterpartyKey(t) !== key || t.categoryId === categoryId) return t;
        changed.push(t.id);
        return { ...t, categoryId };
      }),
    });
    persist(async (d) => {
      await categoriesRepo.upsertRule(d, rule);
      await transactionsRepo.setTransactionCategory(d, changed, categoryId);
    });
    return changed.length;
  },

  setBudget: (categoryId, amountMinor) => {
    const others = get().budgets.filter((b) => b.categoryId !== categoryId);
    set({ budgets: amountMinor && amountMinor > 0 ? [...others, { categoryId, amountMinor }] : others });
    persist((d) => budgetsRepo.setBudget(d, categoryId, amountMinor));
  },

  addCategory: (category) => {
    const created: Category = { ...category, id: `cat-${Date.now().toString(36)}`, isDefault: false };
    const categories = [...get().categories, created];
    set({ categories });
    persist((d) => categoriesRepo.upsertCategory(d, created, categories.length - 1));
  },

  updateCategory: (id, patch) => {
    const categories = get().categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
    set({ categories });
    const index = categories.findIndex((c) => c.id === id);
    if (index >= 0) persist((d) => categoriesRepo.upsertCategory(d, categories[index]!, index));
  },

  // Transactions in a deleted category fall back to Other; its rules and budget go with it.
  deleteCategory: (id) => {
    if (id === 'other') return;
    const { categories, transactions, rules, budgets } = get();
    set({
      categories: categories.filter((c) => c.id !== id),
      transactions: transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: 'other' } : t)),
      rules: rules.filter((r) => r.categoryId !== id),
      budgets: budgets.filter((b) => b.categoryId !== id),
    });
    persist(async (d) => {
      await transactionsRepo.moveCategory(d, id, 'other');
      await categoriesRepo.deleteCategory(d, id);
    });
  },

  dismissReview: (id) => {
    set({ reviewQueue: get().reviewQueue.filter((r) => r.id !== id) });
    persist((d) => reviewRepo.removeReviewItem(d, id));
  },

  // FR-6.3: delete all data.
  reset: () => {
    set(empty);
    persist((d) => wipeLedger(d));
  },
}));

export function useCategory(id: string | null | undefined): Category | undefined {
  return useLedger((s) => s.categories.find((c) => c.id === id));
}
