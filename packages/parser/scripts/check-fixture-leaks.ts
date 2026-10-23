// Checks that no real name, phone number, transaction ID or reference from fixtures/raw/ (git-ignored) appears in
// the committed fixtures. Run after make-fixtures.ts, before committing. Exits 1 on a leak.
// Usage: npx tsx scripts/check-fixture-leaks.ts
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { bundledConfig, parseSms } from '../src';

const ROOT = join(__dirname, '..', 'fixtures');
// Fake names make-fixtures.ts uses, public counterparties and template words: not secrets.
const SAFE = new Set([
  'KOFI', 'AMA', 'YAW', 'ABENA', 'KWAME', 'ESI', 'KWESI', 'AKOSUA', 'KOJO', 'ADJOA', 'KWAKU', 'EFUA', 'FIIFI', 'AFIA',
  'MENSAH', 'BOATENG', 'OWUSU', 'ASANTE', 'DARKO', 'APPIAH', 'AMOAH', 'ADDO', 'QUAYE', 'TETTEH', 'ANSAH',
  'GOLDEN', 'TOUCH', 'VENTURES', 'GRACE', 'MINI', 'MART', 'ROYAL', 'FASHION', 'HOME', 'BLESSED', 'ENTERPRISE', 'SUNRISE', 'STORES',
  'LUNCH', 'TRANSPORT', 'RENT', 'SCHOOL', 'GROCERIES', 'DATA', 'GIFT', 'FUEL',
  'MOBILE', 'MONEY', 'MOMO', 'CASH', 'TELECEL', 'BANK', 'AIRTIME', 'BUNDLE', 'PAYMENTS', 'SERVICES', 'VODAFONE', 'PUSH', 'INTEREST',
  'BALANCE', 'THE', 'THANK YOU', 'ENTER', 'K3K3',
  'TRANSFER', 'TOKEN', 'VOUCHER', 'EXPIRED', 'REFUND', 'CREDIT', 'MERCHANT', 'INV.DEBIT', 'BILLS.INV', 'MTNBUNDLE',
]);

const secrets = new Map<string, string>();
for (const sender of ['MobileMoney', 'T-CASH']) {
  const file = join(ROOT, 'raw', `${sender}.json`);
  if (!existsSync(file)) continue;
  for (const m of JSON.parse(readFileSync(file, 'utf8')) as { date: number; body: string }[]) {
    const r = parseSms({ sender, body: m.body, receivedAt: m.date }, bundledConfig);
    if (r.ok) {
      const t = r.transaction;
      for (const w of (t.counterpartyName ?? '').toUpperCase().split(/\s+/)) if (w.length >= 4) secrets.set(w, 'name word');
      if (t.counterpartyNumber) secrets.set(t.counterpartyNumber, 'number');
      if (t.externalRef) secrets.set(t.externalRef, 'transaction id');
    }
    for (const ref of m.body.matchAll(/(?:Reference|Ref|Message from sender): ?([^.]{4,}?)(?=\.)/g)) secrets.set(ref[1]!.trim().toUpperCase(), 'reference');
    for (const n of m.body.matchAll(/\b0\d{9}\b|\b233\d{9}\b|\b\d{11,16}\b/g)) secrets.set(n[0], 'number or id');
  }
}

let leaks = 0;
for (const dir of ['mtn_momo', 'telecel_cash']) {
  for (const f of readdirSync(join(ROOT, dir)).filter((x) => x.endsWith('.json'))) {
    const text = readFileSync(join(ROOT, dir, f), 'utf8').toUpperCase();
    for (const [secret, kind] of secrets) {
      if (SAFE.has(secret) || /^\d{1,4}$/.test(secret)) continue;
      const re = new RegExp(`(^|[^A-Z0-9])${secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Z0-9]|$)`);
      if (re.test(text)) {
        leaks++;
        // Set SHOW=1 to print the matched value locally (it is real data: never paste it anywhere).
        console.log(`LEAK ${dir}/${f}: ${kind} (${secret.length} chars)`, process.env.SHOW ? secret : '');
      }
    }
  }
}
console.log(`checked against ${secrets.size} real values: ${leaks} leak(s)`);
process.exit(leaks ? 1 : 0);
