import type { Category, CategoryRule } from '@/db/schema';

// FR-3.1, plus Cash withdrawals and Bank transfers (added in schema v2) so moving money doesn't land in Other.
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'fast-food-outline', color: '#F28C38', kind: 'expense', isDefault: true },
  { id: 'transport', name: 'Transport', icon: 'car-outline', color: '#3B82F6', kind: 'expense', isDefault: true },
  { id: 'airtime', name: 'Airtime & Data', icon: 'cellular-outline', color: '#EAB308', kind: 'expense', isDefault: true },
  { id: 'bills', name: 'Bills & Utilities', icon: 'flash-outline', color: '#8B5CF6', kind: 'expense', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: 'bag-handle-outline', color: '#EC4899', kind: 'expense', isDefault: true },
  { id: 'transfers', name: 'Transfers to People', icon: 'people-outline', color: '#14B8A6', kind: 'expense', isDefault: true },
  { id: 'income', name: 'Income', icon: 'arrow-down-outline', color: '#22A05A', kind: 'income', isDefault: true },
  { id: 'fees', name: 'Fees', icon: 'receipt-outline', color: '#9A6B4F', kind: 'expense', isDefault: true },
  { id: 'savings', name: 'Savings', icon: 'wallet-outline', color: '#6366F1', kind: 'expense', isDefault: true },
  { id: 'cash', name: 'Cash withdrawals', icon: 'cash-outline', color: '#A16207', kind: 'expense', isDefault: true },
  { id: 'bank', name: 'Bank transfers', icon: 'business-outline', color: '#475569', kind: 'expense', isDefault: true },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal', color: '#8A948F', kind: 'expense', isDefault: true },
];

export const SYSTEM_RULES: CategoryRule[] = [
  { pattern: 'AIRTIME|DATA BUNDLE|MTN DATA', categoryId: 'airtime' },
  { pattern: 'ECG|GWCL|WATER|DSTV|GOTV|PREPAID|BILLS', categoryId: 'bills' },
  { pattern: 'UBER|BOLT|YANGO|TROTRO|SHELL|GOIL|TOTAL', categoryId: 'transport' },
  { pattern: 'KFC|PIZZA|CHOP|RESTAURANT|KITCHEN|CAFE|BAKERY', categoryId: 'food' },
  { pattern: 'SHOPRITE|MELCOM|MALL|MART|SUPERMARKET|JUMIA', categoryId: 'shopping' },
  { pattern: 'SUSU|SAVINGS|INVEST', categoryId: 'savings' },
  // Wallet ↔ bank in either direction: "BANKPUSH", "ADB Bank Pull", "GT Bank".
  { pattern: 'BANK ?PUSH|BANK ?PULL|\\bBANK\\b', categoryId: 'bank' },
].map((r, i) => ({ ...r, id: `sys-${i}`, matchType: 'keyword', priority: 100 + i, createdBy: 'system' }));
