import type { TransactionType } from '@ledgr/parser';
import type { ReviewItem, Transaction } from '@/db/schema';

// Demo mode: realistic fake data so the app can be tried without real SMS. Every name and number is invented.

interface Merchant {
  name: string;
  number?: string;
  type: TransactionType;
  min: number; // GHS
  max: number;
  perMonth: number;
}

const MERCHANTS: Merchant[] = [
  { name: 'MTN AIRTIME', type: 'airtime_data', min: 5, max: 20, perMonth: 6 },
  { name: 'MTN DATA BUNDLE', type: 'airtime_data', min: 10, max: 50, perMonth: 3 },
  { name: 'ECG PREPAID', type: 'payment', min: 100, max: 300, perMonth: 1 },
  { name: 'DSTV GHANA', type: 'payment', min: 120, max: 120, perMonth: 1 },
  { name: 'BOLT GHANA', type: 'payment', min: 15, max: 60, perMonth: 8 },
  { name: 'YANGO RIDES', type: 'payment', min: 12, max: 45, perMonth: 4 },
  { name: 'AUNTIE AKOS KITCHEN', number: '0241110321', type: 'transfer_out', min: 20, max: 45, perMonth: 9 },
  { name: 'KFC OSU', type: 'payment', min: 45, max: 110, perMonth: 2 },
  { name: 'SHOPRITE ACHIMOTA', type: 'payment', min: 80, max: 400, perMonth: 2 },
  { name: 'MELCOM', type: 'payment', min: 30, max: 250, perMonth: 1 },
  { name: 'KWAME MENSAH', number: '0244000172', type: 'transfer_out', min: 20, max: 200, perMonth: 3 },
  { name: 'ADJOA BOAKYE', number: '0209000448', type: 'transfer_out', min: 50, max: 300, perMonth: 2 },
  { name: 'AGENT KOJO STORES', type: 'cash_out', min: 50, max: 300, perMonth: 2 },
  { name: 'SUSU GROUP', number: '0551000980', type: 'transfer_out', min: 100, max: 100, perMonth: 1 },
];

// Small deterministic PRNG so demo data is the same on every launch.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function seedDemoData(now = new Date()): { transactions: Transaction[]; reviewQueue: ReviewItem[] } {
  const rand = rng(42);
  const pick = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 2) * 50; // nearest 0.50
  const transactions: Omit<Transaction, 'categoryId'>[] = [];
  const months = 4;
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1).getTime();
  const span = now.getTime() - start;
  let ref = 51200000000;

  // Salary/allowance on the 25th, plus occasional incoming transfers.
  for (let m = months - 1; m >= 0; m--) {
    const payday = new Date(now.getFullYear(), now.getMonth() - m, 25, 9, 12);
    if (payday.getTime() <= now.getTime()) {
      transactions.push(tx('transfer_in', 'in', 350000, 'LEDGR DEMO EMPLOYER LTD', undefined, payday.getTime()));
    }
  }
  for (let i = 0; i < months * 2; i++) {
    transactions.push(tx('transfer_in', 'in', pick(50, 300), 'AMA OWUSU', '0551000213', start + rand() * span));
  }

  for (const m of MERCHANTS) {
    for (let i = 0; i < m.perMonth * months; i++) {
      const at = start + rand() * span;
      const amount = pick(m.min, m.max);
      const fee = m.type === 'transfer_out' || m.type === 'cash_out' ? Math.round(amount * 0.0075) : 0;
      const tax = m.type === 'transfer_out' && amount > 10000 ? Math.round(amount * 0.01) : 0;
      transactions.push({ ...tx(m.type, 'out', amount, m.name, m.number, at), feeMinor: fee, taxMinor: tax });
    }
  }

  // Running balance, oldest first.
  transactions.sort((a, b) => a.occurredAt - b.occurredAt);
  let balance = 80000;
  for (const t of transactions) {
    balance += t.direction === 'in' ? t.amountMinor : -(t.amountMinor + t.feeMinor + t.taxMinor);
    balance = Math.max(balance, 0);
    t.balanceAfterMinor = balance;
  }

  const reviewQueue: ReviewItem[] = [
    {
      id: 'rv-1',
      sender: 'MobileMoney',
      body: 'You have received GHS 75.00 via MoMoPay merchant settlement. Ref 99812. Bal GHS 410.20',
      receivedAt: now.getTime() - 3 * 3600_000,
    },
    {
      id: 'rv-2',
      sender: 'MobileMoney',
      body: 'Bank transfer of GHS 500.00 to GCB A/C ****231 successful. Txn 88123001.',
      receivedAt: now.getTime() - 26 * 3600_000,
    },
  ];

  return { transactions: transactions.reverse() as Transaction[], reviewQueue };

  function tx(type: TransactionType, direction: 'in' | 'out', amountMinor: number, name: string, number: string | undefined, at: number): Omit<Transaction, 'categoryId'> {
    ref += 1;
    return {
      id: `demo-${ref}`,
      provider: 'mtn_momo',
      type,
      direction,
      amountMinor,
      feeMinor: 0,
      taxMinor: 0,
      currency: 'GHS',
      counterpartyName: name,
      counterpartyNumber: number,
      externalRef: String(ref),
      occurredAt: Math.round(at),
      source: 'demo',
    };
  }
}
