import { bundledConfig } from '@ledgr/parser';

export interface ReviewHint {
  wallet: string; // "MTN MoMo" rather than the raw sender ID
  kind: string; // a best guess at what the message is about
  amount?: string; // first amount in the message, e.g. "GHS 40.00"
}

// Ordered: first match wins.
const KINDS: [RegExp, string][] = [
  [/revers/i, 'Reversal'],
  [/voucher.*expired/i, 'Expired voucher'],
  [/token/i, 'Token transfer'],
  [/withdraw/i, 'Bank withdrawal'],
  [/bank/i, 'Bank transfer'],
  [/balance:? ?- ?GHS/i, 'Payment on credit'],
  [/received|credited|deposit/i, 'Money in'],
  [/payment|paid|sent|transfer/i, 'Money out'],
];

// Summarises an unrecognised message so the user can decide without reading it all.
export function reviewHint(sender: string, body: string): ReviewHint {
  const wallet = bundledConfig.providers.find((p) => p.senderIds.some((id) => id.toLowerCase() === sender.toLowerCase()))?.name ?? sender;
  const kind = KINDS.find(([re]) => re.test(body))?.[1] ?? 'Unrecognised message';
  return { wallet, kind, amount: amountIn(body) };
}

const AMOUNT = '((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?)';

// The amount a message is about, only when its wording says so ("for GHS 5.00", "received GHS 40.00",
// "of 5.00 GHS"). Balances ("Your Bank Balance: GHS 0.00") are never taken for the amount.
export function amountIn(body: string): string | undefined {
  const m = new RegExp(`(?:for|of|with|received|paid)\\s+GH[S₵C¢]\\s?${AMOUNT}`, 'i').exec(body) ?? new RegExp(`of\\s+${AMOUNT}\\s?GHS`, 'i').exec(body);
  return m ? `GHS ${m[1]}` : undefined;
}
