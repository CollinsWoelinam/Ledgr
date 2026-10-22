import type { Category, CategoryRule } from '@/db/schema';

// FR-3.1
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'fast-food', color: '#E8833A', kind: 'expense', isDefault: true },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#3B82C4', kind: 'expense', isDefault: true },
  { id: 'airtime', name: 'Airtime & Data', icon: 'cellular', color: '#D4A017', kind: 'expense', isDefault: true },
  { id: 'bills', name: 'Bills & Utilities', icon: 'flash', color: '#8B5CF6', kind: 'expense', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: 'bag-handle', color: '#DB4F8A', kind: 'expense', isDefault: true },
  { id: 'transfers', name: 'Transfers to People', icon: 'people', color: '#14A39A', kind: 'expense', isDefault: true },
  { id: 'income', name: 'Income', icon: 'arrow-down-circle', color: '#2E9E5B', kind: 'income', isDefault: true },
  { id: 'fees', name: 'Fees', icon: 'receipt', color: '#9A6B4F', kind: 'expense', isDefault: true },
  { id: 'savings', name: 'Savings', icon: 'wallet', color: '#5B7FD6', kind: 'expense', isDefault: true },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal-circle', color: '#8A8F98', kind: 'expense', isDefault: true },
];

export const SYSTEM_RULES: CategoryRule[] = [
  { pattern: 'AIRTIME|DATA BUNDLE|MTN DATA', categoryId: 'airtime' },
  { pattern: 'ECG|GWCL|WATER|DSTV|GOTV|PREPAID', categoryId: 'bills' },
  { pattern: 'UBER|BOLT|YANGO|TROTRO|SHELL|GOIL|TOTAL', categoryId: 'transport' },
  { pattern: 'KFC|PIZZA|CHOP|RESTAURANT|KITCHEN|CAFE|BAKERY', categoryId: 'food' },
  { pattern: 'SHOPRITE|MELCOM|MALL|MART|SUPERMARKET|JUMIA', categoryId: 'shopping' },
  { pattern: 'SUSU|SAVINGS|INVEST', categoryId: 'savings' },
].map((r, i) => ({ ...r, id: `sys-${i}`, matchType: 'keyword', priority: 100 + i, createdBy: 'system' }));
