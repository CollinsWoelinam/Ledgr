// Builds anonymized fixtures from real SMS in fixtures/raw/ (git-ignored).
// Every captured value (names, numbers, IDs, amounts, dates) and free text (references, notes) is replaced with
// a fake one in the same format. The expected output is the ORIGINAL message's parse with the same substitutions
// applied, so the fixture checks the parser on the anonymized text against independently derived values.
// Usage: npx tsx scripts/make-fixtures.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { bundledConfig, compileTemplate, dedupeKey, normalize, parseSms, toMinorUnits, type ParsedTransaction, type Template } from '../src';

const ROOT = join(__dirname, '..', 'fixtures');
// Telecel has fewer messages per format, so it takes more from each to reach the PRD's 50 per provider.
const PER_TEMPLATE: Record<string, number> = { mtn_momo: 8, telecel_cash: 15 };
const IGNORED_SAMPLES = 4;

const FIRST = ['KOFI', 'AMA', 'YAW', 'ABENA', 'KWAME', 'ESI', 'KWESI', 'AKOSUA', 'KOJO', 'ADJOA', 'KWAKU', 'EFUA', 'FIIFI', 'AFIA'];
const LAST = ['MENSAH', 'BOATENG', 'OWUSU', 'ASANTE', 'DARKO', 'APPIAH', 'AMOAH', 'ADDO', 'QUAYE', 'TETTEH', 'ANSAH'];
const SHOPS = ['GOLDEN TOUCH VENTURES', 'GRACE MINI MART', 'ROYAL FASHION HOME', 'BLESSED ENTERPRISE', 'SUNRISE STORES'];
const NOTES = ['lunch', 'transport', 'rent', 'school', 'groceries', 'data', 'gift', 'fuel'];

// Deterministic PRNG so regenerating gives the same fixtures.
let seed = 20261023;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
const digits = (n: number) => Array.from({ length: n }, (_, i) => (i === 0 ? 1 + Math.floor(rand() * 9) : Math.floor(rand() * 10))).join('');

// Businesses and services every user sees; they identify nobody, and templates depend on some of them.
const PUBLIC_NAMES = /^(MTN|MTNBUNDLE|MTN AIRTIME|MTN DATA.*|VODAFONE PUSH|Bills\.INV|POS\.Inv|KOWRI Payments|Inv\.Debit|Inv Credit|GT Bank|ECG.*|DSTV.*)$/i;

function fakeName(original: string): string {
  if (PUBLIC_NAMES.test(original.trim())) return original;
  const merchant = /^Merchant (\d+)$/.exec(original.trim());
  if (merchant) return `Merchant ${digits(merchant[1]!.length)}`;
  const upper = original === original.toUpperCase();
  const words = original.trim().split(/\s+/).length;
  const shop = /VENTURES|ENTERPRISE|SHOP|STORE|MART|FASHION|LTD|CENTER|CENTRE|SERVICES|HOME/i.test(original);
  const name = shop ? pick(SHOPS) : [pick(FIRST), ...Array.from({ length: Math.max(1, Math.min(words, 3) - 1) }, () => pick(LAST))].join(' ');
  return upper ? name : name.replace(/\B[A-Z]+/g, (m) => m.toLowerCase());
}

// Same shape as the original: decimals, thousands commas.
function fakeAmount(original: string): string {
  const decimals = original.includes('.') ? original.split('.')[1]!.length : 0;
  const whole = original.split('.')[0]!.replace(/,/g, '');
  const scale = 10 ** (whole.length - 1);
  const value = Math.max(1, Math.floor(rand() * 9 * scale + scale));
  const body = original.includes(',') ? value.toLocaleString('en-US') : String(value);
  return decimals ? `${body}.${digits(decimals).padStart(decimals, '0').slice(0, decimals)}` : body;
}

function fakeDate(original: string): string {
  // Keep the format; move to a fixed month so real dates aren't published.
  return original.replace(/^\d{4}-\d{2}-(\d{2})/, (_, d) => `2026-03-${String(Math.min(Number(d), 28)).padStart(2, '0')}`).replace(/\d{2}:\d{2}:\d{2}/, () => `${String(Math.floor(rand() * 14) + 7).padStart(2, '0')}:${digits(2).slice(0, 1)}${Math.floor(rand() * 10)}:${Math.floor(rand() * 6)}${Math.floor(rand() * 10)}`);
}

const NAMED_GROUP_FAKES: Record<string, (v: string) => string> = {
  name: fakeName,
  number: (v) => (v.startsWith('233') ? `233${digits(v.length - 3)}` : v.startsWith('0') ? `0${digits(v.length - 1)}` : digits(v.length)),
  ref: (v) => digits(v.length),
  original_ref: (v) => digits(v.length),
  amount: fakeAmount,
  balance: fakeAmount,
  fee: fakeAmount,
  tax: fakeAmount,
  date: fakeDate,
};

interface Fixture {
  description: string;
  synthetic: false;
  sms: { sender: string; body: string; receivedAt: string };
  expected: Omit<ParsedTransaction, 'templateVersion'> | null;
}

const localIso = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

function anonymize(sender: string, raw: { date: number; body: string }, template: Template): Fixture | null {
  const body = normalize(raw.body);
  const re = new RegExp(compileTemplate(template).source, 'id');
  const m = re.exec(body) as (RegExpExecArray & { indices: { groups: Record<string, [number, number] | undefined> } }) | null;
  if (!m?.groups) return null;

  // Replace captured spans right to left so earlier indices stay valid.
  const spans = Object.entries(m.indices.groups)
    .filter((e): e is [string, [number, number]] => !!e[1] && e[0] in NAMED_GROUP_FAKES)
    .sort((a, b) => b[1][0] - a[1][0]);
  const replacements: Record<string, string> = {};
  let text = body;
  for (const [group, [start, end]] of spans) {
    const fake = NAMED_GROUP_FAKES[group]!(body.slice(start, end));
    replacements[group] = fake;
    text = text.slice(0, start) + fake + text.slice(end);
  }

  // Free text no template captures: references, notes, people named inside references, links.
  text = text
    .replace(/(Reference|Ref|Message from sender|Message): ?[^.]*/g, (_, k) => `${k}: ${pick(NOTES)}`)
    .replace(/External Transaction Id: \d+/g, () => `External Transaction Id: ${digits(11)}`)
    .replace(/https?:\/\/\S+/g, 'https://example.com/app');

  // Uncaptured amounts: Available Balance mirrors the fake balance; anything else gets its own fake.
  const ourAmounts = new Set(['amount', 'balance', 'fee', 'tax'].map((k) => replacements[k]).filter(Boolean));
  text = text
    .replace(/(Available Balance:? GHS ?)(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?/g, (all, prefix) => (replacements.balance ? prefix + replacements.balance : all))
    .replace(/(GHS ?)((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/g, (all, prefix, value) => (ourAmounts.has(value) ? all : prefix + fakeAmount(value)));

  // Any remaining long digit run that isn't one we produced gets randomized too.
  const ours = new Set(Object.values(replacements).flatMap((v) => v.match(/\d{6,}/g) ?? []));
  text = text.replace(/\d{6,}/g, (run) => (ours.has(run) ? run : digits(run.length)));

  const receivedAt = new Date(2026, 2, 1 + Math.floor(rand() * 27), 7 + Math.floor(rand() * 14), Math.floor(rand() * 60)).getTime();
  const original = parseSms({ sender, body: raw.body, receivedAt }, bundledConfig);
  if (!original.ok) return null;
  const o = original.transaction;

  // Expected = the original parse with the same substitutions.
  const money = (k: string, v: number) => (replacements[k] ? toMinorUnits(replacements[k]!) : v);
  const fakeDateMs = replacements.date ? parseSms({ sender, body: text, receivedAt }, bundledConfig) : null;
  const { templateVersion: _v, ...rest } = o;
  const expected: Fixture['expected'] = {
    ...rest,
    amountMinor: money('amount', o.amountMinor),
    feeMinor: money('fee', o.feeMinor),
    taxMinor: money('tax', o.taxMinor),
    balanceAfterMinor: o.balanceAfterMinor === undefined ? undefined : money('balance', o.balanceAfterMinor),
    counterpartyName: replacements.name ?? o.counterpartyName,
    counterpartyNumber: replacements.number ?? o.counterpartyNumber,
    externalRef: replacements.ref ?? o.externalRef,
    reversesRef: replacements.original_ref ?? o.reversesRef,
    // A message's own timestamp is the one input not derived independently: take it from the fake text.
    occurredAt: replacements.date && fakeDateMs?.ok ? fakeDateMs.transaction.occurredAt : receivedAt,
  };
  return {
    description: `${template.type}, ${template.provider} template ${bundledConfig.templates.filter((t) => t.provider === template.provider).indexOf(template)}`,
    synthetic: false,
    sms: { sender, body: text, receivedAt: localIso(receivedAt) },
    expected: { ...expected, occurredAt: localIso(expected.occurredAt) as unknown as number },
  };
}

const PROVIDER_FOR: Record<string, string> = { MobileMoney: 'mtn_momo', 'T-CASH': 'telecel_cash' };

for (const [sender, providerId] of Object.entries(PROVIDER_FOR)) {
  const file = join(ROOT, 'raw', `${sender}.json`);
  if (!existsSync(file)) continue;
  const messages: { date: number; body: string }[] = JSON.parse(readFileSync(file, 'utf8'));
  const dir = join(ROOT, providerId);
  if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith('.json')) rmSync(join(dir, f));
  mkdirSync(dir, { recursive: true });

  const templates = bundledConfig.templates.filter((t) => t.provider === providerId);
  const perTemplate = new Map<Template, number>();
  const seen = new Set<string>();
  let written = 0;
  for (const raw of messages) {
    const r = parseSms({ sender, body: raw.body, receivedAt: raw.date }, bundledConfig);
    if (!r.ok || seen.has(dedupeKey(r.transaction))) continue;
    seen.add(dedupeKey(r.transaction));
    const template = templates.find((t) => compileTemplate(t).test(normalize(raw.body)))!;
    if ((perTemplate.get(template) ?? 0) >= PER_TEMPLATE[providerId]!) continue;
    const fixture = anonymize(sender, raw, template);
    if (!fixture) continue;
    perTemplate.set(template, (perTemplate.get(template) ?? 0) + 1);
    writeFileSync(join(dir, `t${templates.indexOf(template)}_${String(++written).padStart(3, '0')}.json`), JSON.stringify(fixture, null, 2) + '\n');
  }

  // A few known non-transactions, with every digit masked.
  let ignored = 0;
  for (const raw of messages) {
    if (ignored >= IGNORED_SAMPLES) break;
    const r = parseSms({ sender, body: raw.body, receivedAt: raw.date }, bundledConfig);
    if (r.ok || r.reason !== 'ignored' || /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(raw.body) || ignored > 0 && rand() < 0.97) continue;
    const body = normalize(raw.body).replace(/\d/g, () => String(Math.floor(rand() * 10))).replace(/https?:\/\/\S+/g, 'https://example.com/app');
    const fixture: Fixture = { description: 'non-transaction message from the wallet sender', synthetic: false, sms: { sender, body, receivedAt: '2026-03-10T09:00:00' }, expected: null };
    writeFileSync(join(dir, `ignored_${++ignored}.json`), JSON.stringify(fixture, null, 2) + '\n');
  }
  console.log(`${providerId}: ${written} transaction fixtures across ${perTemplate.size}/${templates.length} templates, ${ignored} ignored`);
}
