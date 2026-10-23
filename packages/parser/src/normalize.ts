const CURRENCY_ALIASES: [RegExp, string][] = [
  [/GH₵|GH¢|₵|¢/g, 'GHS'],
  [/\bGHC\b/g, 'GHS'],
];

// Step 3: collapse whitespace, straighten curly apostrophes, unify currency symbols, drop spaces inside numbers ("1 234.50").
export function normalize(body: string): string {
  let out = body.replace(/\s+/g, ' ').replace(/[\u2018\u2019]/g, "'").trim();
  for (const [pattern, code] of CURRENCY_ALIASES) out = out.replace(pattern, code);
  return out.replace(/(\d) (?=\d{3}\b)/g, '$1');
}
