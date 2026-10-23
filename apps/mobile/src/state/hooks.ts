import { bundledConfig } from '@ledgr/parser';
import { useMemo } from 'react';
import type { Transaction } from '@/db/schema';
import { periodContaining, type Period } from '@/features/budgets/period';
import { useLedger } from './ledger';
import { useSettings } from './settings';

export function usePeriod(offset = 0): Period {
  const startDay = useSettings((s) => s.monthStartDay);
  return useMemo(() => periodContaining(new Date(), startDay, offset), [startDay, offset]);
}

export interface Wallet {
  id: string;
  name: string;
}

// Wallets that actually have transactions, in provider order.
export function walletsIn(transactions: Transaction[]): Wallet[] {
  const present = new Set(transactions.map((t) => t.provider));
  return bundledConfig.providers.filter((p) => present.has(p.id)).map((p) => ({ id: p.id, name: p.name }));
}

// A choice that no longer matches any wallet (e.g. after deleting data) means all wallets.
export function selectWallet(transactions: Transaction[], wallets: Wallet[], selected: string): { transactions: Transaction[]; wallet: Wallet | null } {
  const wallet = wallets.find((w) => w.id === selected) ?? null;
  return { transactions: wallet ? transactions.filter((t) => t.provider === wallet.id) : transactions, wallet };
}

export function useWallets(): Wallet[] {
  const transactions = useLedger((s) => s.transactions);
  return useMemo(() => walletsIn(transactions), [transactions]);
}

// Transactions for the wallet picked in the switcher.
export function useWalletTransactions(): { transactions: Transaction[]; wallet: Wallet | null } {
  const all = useLedger((s) => s.transactions);
  const selected = useSettings((s) => s.wallet);
  const wallets = useWallets();
  return useMemo(() => selectWallet(all, wallets, selected), [all, selected, wallets]);
}
