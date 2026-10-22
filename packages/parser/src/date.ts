const TOKENS: Record<string, string> = {
  yyyy: '(?<year>\\d{4})',
  yy: '(?<year>\\d{2})',
  MM: '(?<month>\\d{1,2})',
  dd: '(?<day>\\d{1,2})',
  HH: '(?<hour>\\d{1,2})',
  mm: '(?<minute>\\d{2})',
  ss: '(?<second>\\d{2})',
};

const cache = new Map<string, RegExp>();

function compile(format: string): RegExp {
  let re = cache.get(format);
  if (!re) {
    const source = format
      .split(/(yyyy|yy|MM|dd|HH|mm|ss)/)
      .map((part) => TOKENS[part] ?? part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('');
    re = new RegExp(`^${source}$`);
    cache.set(format, re);
  }
  return re;
}

// Parses a provider timestamp as device-local time. Returns NaN if it doesn't fit the format.
export function parseDate(value: string, format: string): number {
  const g = compile(format).exec(value.trim())?.groups;
  if (!g) return NaN;
  const year = g.year!.length === 2 ? 2000 + Number(g.year) : Number(g.year);
  const month = Number(g.month) - 1;
  const date = new Date(year, month, Number(g.day), Number(g.hour ?? 0), Number(g.minute ?? 0), Number(g.second ?? 0));
  return date.getMonth() === month ? date.getTime() : NaN;
}
