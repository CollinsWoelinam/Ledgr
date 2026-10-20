// "1,234.50" → 123450. Never use floats for stored money.
export function toMinorUnits(amount: string): number {
  const [whole = '0', frac = ''] = amount.replace(/,/g, '').split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0').slice(0, 2));
}
