import { DEFAULT_CATEGORIES, SYSTEM_RULES } from '@/features/categorization/defaultCategories';
import type { Budget, Category, CategoryRule, ReviewItem, Transaction } from '../schema';
import type { SqlDb } from '../sql';
import { listBudgets } from './budgets';
import { listCategories, listRules, upsertCategory, upsertRule } from './categories';
import { listReviewItems } from './reviewQueue';
import { listTransactions } from './transactions';

export interface LedgerSnapshot {
  transactions: Transaction[];
  categories: Category[];
  rules: CategoryRule[];
  budgets: Budget[];
  reviewQueue: ReviewItem[];
}

// First run: install the default categories and system rules.
export async function ensureDefaults(db: SqlDb): Promise<void> {
  const existing = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  if (existing?.n) return;
  await db.transaction(async () => {
    for (const [i, c] of DEFAULT_CATEGORIES.entries()) await upsertCategory(db, c, i);
    for (const r of SYSTEM_RULES) await upsertRule(db, r);
  });
}

export async function loadLedger(db: SqlDb): Promise<LedgerSnapshot> {
  const [transactions, categories, rules, budgets, reviewQueue] = await Promise.all([
    listTransactions(db),
    listCategories(db),
    listRules(db),
    listBudgets(db),
    listReviewItems(db),
  ]);
  return { transactions, categories, rules, budgets, reviewQueue };
}

// FR-6.3: everything the user has, gone, then defaults back so the app still works.
export async function wipeLedger(db: SqlDb): Promise<void> {
  await db.transaction(async () => {
    for (const table of ['transactions', 'budgets', 'category_rules', 'review_queue', 'categories', 'parser_templates', 'sync_state']) {
      await db.run(`DELETE FROM ${table}`);
    }
  });
  await ensureDefaults(db);
}
