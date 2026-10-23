import type { CategoryRule } from '@/db/schema';
import { categorize } from './categorize';
import { SYSTEM_RULES } from './defaultCategories';

const tx = (type: 'payment' | 'transfer_out' | 'transfer_in', name?: string, number?: string) => ({ type, counterpartyName: name, counterpartyNumber: number });
const userRule = (pattern: string, categoryId: string): CategoryRule => ({ id: `u-${pattern}`, matchType: 'counterparty', pattern, categoryId, priority: 0, createdBy: 'user' });

test('keyword rules categorize by counterparty name', () => {
  expect(categorize(tx('payment', 'ECG PREPAID'), SYSTEM_RULES)).toBe('bills');
  expect(categorize(tx('payment', 'Bolt Ghana'), SYSTEM_RULES)).toBe('transport');
});

test('falls back to the type default', () => {
  expect(categorize(tx('transfer_out', 'KWAME MENSAH', '0244000172'), SYSTEM_RULES)).toBe('transfers');
  expect(categorize(tx('transfer_in', 'AMA OWUSU'), SYSTEM_RULES)).toBe('income');
  expect(categorize(tx('payment'), SYSTEM_RULES)).toBe('other');
});

test('user counterparty rules beat keyword rules', () => {
  const rules = [...SYSTEM_RULES, userRule('ECG PREPAID', 'savings')];
  expect(categorize(tx('payment', 'ECG Prepaid'), rules)).toBe('savings');
});

test('counterparty rules match on number when there is one', () => {
  const rules = [...SYSTEM_RULES, userRule('0241110321', 'food')];
  expect(categorize(tx('transfer_out', 'AUNTIE AKOS', '0241110321'), rules)).toBe('food');
  expect(categorize(tx('transfer_out', 'AUNTIE AKOS', '0200000000'), rules)).toBe('transfers');
});

test('cash-outs go to Cash withdrawals, bank moves to Bank transfers in either direction', () => {
  expect(categorize({ type: 'cash_out', counterpartyName: "TONY'S FASHION HOME" }, SYSTEM_RULES)).toBe('cash');
  expect(categorize({ type: 'payment', counterpartyName: 'BANKPUSH' }, SYSTEM_RULES)).toBe('bank');
  expect(categorize({ type: 'transfer_in', counterpartyName: 'ADB Bank Pull' }, SYSTEM_RULES)).toBe('bank');
  expect(categorize({ type: 'transfer_in', counterpartyName: 'GT Bank' }, SYSTEM_RULES)).toBe('bank');
  // Not every name containing the letters is a bank.
  expect(categorize({ type: 'transfer_out', counterpartyName: 'KOFI BANKOLE' }, SYSTEM_RULES)).toBe('transfers');
});
