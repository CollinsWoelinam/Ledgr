// "1,234.50" → 123450. Never use floats for stored money.
export function toMinorUnits(amount: string): number {
  const cleaned = amount.replace(/,/g, '').replace(/\.$/, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return NaN;
  const [whole = '0', frac = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0').slice(0, 2));
}
