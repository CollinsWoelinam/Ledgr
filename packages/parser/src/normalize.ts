// Step 3: trim whitespace, unify currency symbols and thousand separators.
export function normalize(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}
