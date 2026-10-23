// Runs the parser over real SMS exported to fixtures/raw/ (git-ignored, never committed) and reports:
// match/ignore/unmatched counts, unmatched message shapes, and a balance-chain check
// (previous balance ± amount − fees should equal the reported new balance).
// Usage: npx tsx scripts/real-corpus.ts (reads raw/<sender>.json; convert adb .txt exports with scripts/raw-to-json.ts)
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { bundledConfig, compileTemplate, dedupeKey, parseSms, type ParsedTransaction } from '../src';

const RAW = join(__dirname, '..', 'fixtures', 'raw');
const SENDERS = ['MobileMoney', 'T-CASH'];

const shape = (body: string) => body.replace(/\s+/g, ' ').replace(/\d[\d,.]*/g, '#').replace(/\b[A-Z][A-Z'.&-]+(?: [A-Z][A-Z'.&-]+)+\b/g, 'NAME').slice(0, 90);

for (const sender of SENDERS) {
  const file = join(RAW, `${sender}.json`);
  if (!existsSync(file)) continue;
  const messages: { date: number; body: string }[] = JSON.parse(readFileSync(file, 'utf8'));
  const reasons: Record<string, number> = {};
  const byTemplate: Record<string, number> = {};
  const unmatched = new Map<string, number>();
  const parsed: (ParsedTransaction & { receivedAt: number })[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const m of messages) {
    const result = parseSms({ sender, body: m.body, receivedAt: m.date }, bundledConfig);
    if (result.ok) {
      // Same dedupe the app applies (FR-2.3): MTN sometimes sends two SMS for one transaction.
      const key = dedupeKey(result.transaction);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      parsed.push({ ...result.transaction, receivedAt: m.date });
      const t = bundledConfig.templates.find((x) => x.provider === result.transaction.provider && compileTemplate(x).test(m.body.replace(/\s+/g, ' ').trim()));
      const label = `${result.transaction.type} #${t ? bundledConfig.templates.indexOf(t) : "?"}`;
      byTemplate[label] = (byTemplate[label] ?? 0) + 1;
    } else {
      reasons[result.reason] = (reasons[result.reason] ?? 0) + 1;
      if (result.reason !== 'ignored') unmatched.set(`${result.reason}: ${shape(m.body)}`, (unmatched.get(`${result.reason}: ${shape(m.body)}`) ?? 0) + 1);
    }
  }

  // Balance chain over messages in arrival order.
  parsed.sort((a, b) => a.receivedAt - b.receivedAt);
  let checked = 0;
  let consistent = 0;
  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1]!;
    const cur = parsed[i]!;
    if (prev.balanceAfterMinor === undefined || cur.balanceAfterMinor === undefined) continue;
    checked++;
    const delta = (cur.direction === 'in' ? cur.amountMinor : -cur.amountMinor) - cur.feeMinor - cur.taxMinor;
    if (Math.abs(prev.balanceAfterMinor + delta - cur.balanceAfterMinor) <= 1) consistent++;
  }

  console.log(`\n===== ${sender}: ${messages.length} messages`);
  console.log(`parsed ${parsed.length} (+${duplicates} duplicate SMS dropped)`, reasons);
  console.log('by template:', byTemplate);
  console.log(`balance chain: ${consistent}/${checked} consecutive pairs consistent (${((consistent / Math.max(checked, 1)) * 100).toFixed(1)}%)`);
  console.log('unmatched shapes:');
  for (const [k, n] of [...unmatched].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${String(n).padStart(4)}  ${k}`);
}
