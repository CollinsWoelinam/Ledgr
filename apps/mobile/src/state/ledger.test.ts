import { useLedger } from './ledger';

beforeEach(() => useLedger.getState().loadDemo());

test('demo data is categorized', () => {
  const { transactions } = useLedger.getState();
  expect(transactions.length).toBeGreaterThan(100);
  expect(transactions.find((t) => t.counterpartyName === 'ECG PREPAID')?.categoryId).toBe('bills');
});

test('apply to all re-categorizes every transaction from the counterparty and saves a rule', () => {
  const { transactions, setCategory } = useLedger.getState();
  const target = transactions.find((t) => t.counterpartyName === 'AUNTIE AKOS KITCHEN')!;
  const total = transactions.filter((t) => t.counterpartyName === 'AUNTIE AKOS KITCHEN').length;

  expect(setCategory(target.id, 'savings', true)).toBe(total);
  const after = useLedger.getState();
  expect(after.transactions.filter((t) => t.counterpartyName === 'AUNTIE AKOS KITCHEN').every((t) => t.categoryId === 'savings')).toBe(true);
  expect(after.rules[0]).toMatchObject({ matchType: 'counterparty', pattern: target.counterpartyNumber, categoryId: 'savings', createdBy: 'user' });
});

test('just this one leaves the others alone', () => {
  const { transactions, setCategory } = useLedger.getState();
  const [a, b] = transactions.filter((t) => t.counterpartyName === 'KWAME MENSAH');
  setCategory(a!.id, 'savings', false);
  const after = useLedger.getState().transactions;
  expect(after.find((t) => t.id === a!.id)?.categoryId).toBe('savings');
  expect(after.find((t) => t.id === b!.id)?.categoryId).toBe('transfers');
});

test('deleting a category moves its transactions to Other and drops its budget', () => {
  useLedger.getState().deleteCategory('food');
  const s = useLedger.getState();
  expect(s.categories.some((c) => c.id === 'food')).toBe(false);
  expect(s.transactions.some((t) => t.categoryId === 'food')).toBe(false);
  expect(s.budgets.some((b) => b.categoryId === 'food')).toBe(false);
});
