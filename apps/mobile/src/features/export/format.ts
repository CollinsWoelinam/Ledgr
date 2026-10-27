import type { Category, Transaction } from '@/db/schema';
import { inPeriod, type Period } from '@/features/budgets/period';
import { walletName } from '@/features/cash/pocket';
import { spendByCategory, summarize } from '@/features/insights/queries';
import { formatAmount, formatMoney } from '@/lib/format';

// US-13: transactions out of Ledgr, as CSV for spreadsheets or a PDF statement. Never the original SMS text.

export interface ExportScope {
  period: Period;
  label: string; // e.g. "1 Oct – 31 Oct 2026"
  wallets: string[] | null; // null = every wallet
}

export function inScope(transactions: Transaction[], scope: ExportScope): Transaction[] {
  return transactions
    .filter((t) => inPeriod(t.occurredAt, scope.period) && (!scope.wallets || scope.wallets.includes(t.provider)))
    .sort((a, b) => a.occurredAt - b.occurredAt);
}

const pad = (n: number) => String(n).padStart(2, '0');
const day = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const time = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const decimal = (minor: number) => (minor / 100).toFixed(2);

// Text starting with = + - @ (or a tab/return) can run as a formula when the CSV is opened in a spreadsheet,
// so it gets a leading apostrophe. Plain numbers like -45.50 are left alone.
function cell(value: string | undefined): string {
  let s = value ?? '';
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS = ['Date', 'Time', 'Wallet', 'Direction', 'Counterparty', 'Number', 'Category', 'Business', 'Amount', 'Fee', 'E-levy', 'Balance after', 'Transaction ID', 'Source'];

// Amount is signed (money out negative), so a spreadsheet SUM gives the net change.
export function toCsv(transactions: Transaction[], categories: Category[]): string {
  const name = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const rows = transactions.map((t) =>
    [
      day(t.occurredAt),
      time(t.occurredAt),
      walletName(t.provider),
      t.direction === 'out' ? 'Out' : 'In',
      t.counterpartyName,
      t.counterpartyNumber,
      name(t.categoryId),
      t.business ? 'Yes' : 'No',
      decimal(t.direction === 'out' ? -t.amountMinor : t.amountMinor),
      decimal(t.feeMinor),
      decimal(t.taxMinor),
      t.balanceAfterMinor === undefined ? undefined : decimal(t.balanceAfterMinor),
      t.externalRef,
      t.source === 'manual' ? 'Added by you' : 'SMS',
    ]
      .map(cell)
      .join(','),
  );
  // The byte-order mark makes Excel read ₵ and accented names as UTF-8.
  return `﻿${[COLUMNS.join(','), ...rows].join('\r\n')}\r\n`;
}

const html = (s: string | undefined) => (s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

// A printable statement: totals, spending by category, then every transaction.
export function toStatementHtml(transactions: Transaction[], categories: Category[], scope: ExportScope, currency: string): string {
  const name = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const money = (minor: number) => html(formatMoney(minor, currency));
  const total = summarize(transactions, scope.period);
  const byCategory = spendByCategory(transactions, scope.period);
  const wallets = scope.wallets ? scope.wallets.map(walletName).join(', ') : 'All wallets';

  const rows = transactions
    .map(
      (t) => `<tr>
  <td>${day(t.occurredAt)} ${time(t.occurredAt)}</td>
  <td>${html(walletName(t.provider))}</td>
  <td>${html(t.counterpartyName ?? '—')}${t.business ? ' <span class="tag">Business</span>' : ''}</td>
  <td>${html(name(t.categoryId))}</td>
  <td class="num ${t.direction}">${t.direction === 'out' ? '−' : '+'}${formatAmount(t.amountMinor)}</td>
  <td class="num">${t.feeMinor + t.taxMinor ? formatAmount(t.feeMinor + t.taxMinor) : ''}</td>
</tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Ledgr statement</title>
<style>
  body { font-family: -apple-system, Roboto, "Segoe UI", sans-serif; color: #0E2A22; margin: 32px; font-size: 11px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #4A5A53; margin: 0 0 20px; }
  .totals { display: flex; gap: 12px; margin-bottom: 20px; }
  .total { flex: 1; background: #F4F6F1; border-radius: 10px; padding: 10px 12px; }
  .total b { display: block; font-size: 15px; margin-top: 2px; }
  h2 { font-size: 13px; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; color: #4A5A53; font-weight: 600; border-bottom: 1px solid #C9D2CD; padding: 6px 4px; }
  td { border-bottom: 1px solid #E4E9E6; padding: 5px 4px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .in { color: #1E7A45; }
  .tag { font-size: 9px; background: #E4E9E6; border-radius: 4px; padding: 1px 4px; }
  tr { page-break-inside: avoid; }
  .foot { color: #4A5A53; margin-top: 20px; font-size: 10px; }
</style></head>
<body>
  <h1>Ledgr statement</h1>
  <p class="sub">${html(scope.label)} · ${html(wallets)} · ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}</p>
  <div class="totals">
    <div class="total">Money out<b>${money(total.outMinor)}</b></div>
    <div class="total">Money in<b>${money(total.inMinor)}</b></div>
    <div class="total">Fees &amp; e-levy<b>${money(total.feesMinor)}</b></div>
  </div>
  ${byCategory.length ? `<h2>Spending by category</h2><table>${byCategory.map((c) => `<tr><td>${html(name(c.categoryId))}</td><td class="num">${money(c.amountMinor)}</td></tr>`).join('')}</table>` : ''}
  <h2>Transactions</h2>
  <table>
    <thead><tr><th>Date</th><th>Wallet</th><th>Counterparty</th><th>Category</th><th class="num">Amount</th><th class="num">Charges</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="foot">Made by Ledgr on this phone from your wallet SMS and the entries you added. Cash you recorded is counted within your cash withdrawals, not on top of them.</p>
</body></html>`;
}
