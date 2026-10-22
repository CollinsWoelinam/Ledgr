// Minor units → display string, e.g. 123450 → "GHS 1,234.50".
export function formatMoney(minor: number, currency: string, opts: { sign?: boolean; compact?: boolean } = {}): string {
  const abs = Math.abs(minor) / 100;
  const digits = opts.compact && abs >= 1000 ? 0 : 2;
  const body = abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const sign = minor < 0 ? '−' : opts.sign && minor > 0 ? '+' : '';
  return `${sign}${currency} ${body}`;
}

export function formatDay(at: number, now = Date.now()): string {
  const d = new Date(at);
  const today = new Date(now);
  const yesterday = new Date(now - 86400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(at: number): string {
  return new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function parseMoneyInput(text: string): number | undefined {
  const cleaned = text.replace(/[^\d.]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return undefined;
  const [whole = '0', frac = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}
