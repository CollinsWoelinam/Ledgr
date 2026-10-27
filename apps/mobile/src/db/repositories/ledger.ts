import { DEFAULT_CATEGORIES, SYSTEM_RULES } from '@/features/categorization/defaultCategories';
import type { Budget, Category, CategoryRule, ReviewItem, StoredEvidence, Transaction } from '../schema';
import type { SqlDb } from '../sql';
import { listBudgets } from './budgets';
import { listEvidence } from './evidence';
import { listDismissedGaps } from './gaps';
import { listCategories, listRules, upsertCategory, upsertRule } from './categories';
import { listReviewItems } from './reviewQueue';
import { listBusinessCounterparties, listTransactions } from './transactions';

export interface LedgerSnapshot {
  transactions: Transaction[];
  categories: Category[];
  rules: CategoryRule[];
  budgets: Budget[];
  reviewQueue: ReviewItem[];
  dismissedGaps: string[];
  evidence: StoredEvidence[];
  businessCounterparties: string[]; // counterparty keys whose transactions are business
}

// First run installs the default categories. System rules are the app's, not the user's, so they're refreshed on
// every launch: improved keyword rules reach existing installs. User rules (created_by = 'user') are untouched.
export async function ensureDefaults(db: SqlDb): Promise<void> {
  const existing = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  const present = new Set((await db.all<{ id: string }>('SELECT id FROM categories')).map((c) => c.id));
  await db.transaction(async () => {
    if (!existing?.n) for (const [i, c] of DEFAULT_CATEGORIES.entries()) await upsertCategory(db, c, i);
    // A system rule whose category the user deleted stays deleted.
    for (const r of SYSTEM_RULES) if (!existing?.n || present.has(r.categoryId)) await upsertRule(db, r);
  });
}

export async function loadLedger(db: SqlDb): Promise<LedgerSnapshot> {
  const [transactions, categories, rules, budgets, reviewQueue, dismissedGaps, evidence, businessCounterparties] = await Promise.all([
    listTransactions(db),
    listCategories(db),
    listRules(db),
    listBudgets(db),
    listReviewItems(db),
    listDismissedGaps(db),
    listEvidence(db),
    listBusinessCounterparties(db),
  ]);
  return { transactions, categories, rules, budgets, reviewQueue, dismissedGaps, evidence, businessCounterparties };
}

// FR-6.3: everything the user has, gone, then defaults back so the app still works.
export async function wipeLedger(db: SqlDb): Promise<void> {
  await db.transaction(async () => {
    for (const table of ['transactions', 'budgets', 'category_rules', 'review_queue', 'categories', 'parser_templates', 'sync_state', 'dismissed_gaps', 'evidence', 'business_counterparties']) {
      await db.run(`DELETE FROM ${table}`);
    }
  });
  await ensureDefaults(db);
}
