import { create } from 'zustand';
import type { Budget, Category, CategoryRule, ReviewItem, Transaction } from '@/db/schema';
import { categorize, counterpartyKey } from '@/features/categorization/categorize';
import { DEFAULT_CATEGORIES, SYSTEM_RULES } from '@/features/categorization/defaultCategories';
import { seedDemoData } from '@/demo/seed';

// In-memory ledger. The actions are the seam where the SQLCipher repositories plug in later.
export interface LedgerState {
  transactions: Transaction[];
  categories: Category[];
  rules: CategoryRule[];
  budgets: Budget[];
  reviewQueue: ReviewItem[];
  loadDemo: () => void;
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

const empty = { transactions: [], categories: DEFAULT_CATEGORIES, rules: SYSTEM_RULES, budgets: [], reviewQueue: [] };

export const useLedger = create<LedgerState>()((set, get) => ({
  ...empty,

  loadDemo: () => {
    const { transactions, reviewQueue } = seedDemoData();
    const rules = SYSTEM_RULES;
    set({
      transactions: transactions.map((t) => ({ ...t, categoryId: categorize(t, rules) })),
      categories: DEFAULT_CATEGORIES,
      rules,
      budgets: DEMO_BUDGETS,
      reviewQueue,
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
      return 1;
    }

    const rule: CategoryRule = { id: `user-${key}`, matchType: 'counterparty', pattern: key, categoryId, priority: 0, createdBy: 'user' };
    let changed = 0;
    set({
      rules: [rule, ...rules.filter((r) => r.id !== rule.id)],
      transactions: transactions.map((t) => {
        if (counterpartyKey(t) !== key || t.categoryId === categoryId) return t;
        changed += 1;
        return { ...t, categoryId };
      }),
    });
    return changed;
  },

  setBudget: (categoryId, amountMinor) => {
    const others = get().budgets.filter((b) => b.categoryId !== categoryId);
    set({ budgets: amountMinor && amountMinor > 0 ? [...others, { categoryId, amountMinor }] : others });
  },

  addCategory: (category) => {
    const id = `cat-${Date.now().toString(36)}`;
    set({ categories: [...get().categories, { ...category, id, isDefault: false }] });
  },

  updateCategory: (id, patch) => {
    set({ categories: get().categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  },

  // Transactions in a deleted category fall back to Other.
  deleteCategory: (id) => {
    if (id === 'other') return;
    const { categories, transactions, rules, budgets } = get();
    set({
      categories: categories.filter((c) => c.id !== id),
      transactions: transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: 'other' } : t)),
      rules: rules.filter((r) => r.categoryId !== id),
      budgets: budgets.filter((b) => b.categoryId !== id),
    });
  },

  dismissReview: (id) => set({ reviewQueue: get().reviewQueue.filter((r) => r.id !== id) }),

  reset: () => set(empty),
}));

export function useCategory(id: string | null | undefined): Category | undefined {
  return useLedger((s) => s.categories.find((c) => c.id === id));
}
