import { bundledConfig, parseSms } from '../src';
import type { ParsedTransaction } from '../src/types';
import { loadFixtures } from './fixtures';

// PRD success metric: ≥ 98% of parsed fields correct across the corpus.
const ACCURACY_GATE = 0.98;

const FIELDS: (keyof ParsedTransaction)[] = [
  'provider', 'type', 'direction', 'amountMinor', 'feeMinor', 'taxMinor', 'currency',
  'counterpartyName', 'counterpartyNumber', 'balanceAfterMinor', 'externalRef', 'reversesRef', 'occurredAt',
];

const fixtures = loadFixtures();

test('corpus is not empty', () => {
  expect(fixtures.length).toBeGreaterThan(0);
});

test(`field accuracy across the corpus is at least ${ACCURACY_GATE * 100}%`, () => {
  let checked = 0;
  let failed = 0;
  const misses: string[] = [];

  for (const fx of fixtures) {
    const result = parseSms(fx.sms, bundledConfig);

    if (fx.expected === null) {
      checked += 1;
      if (result.ok) {
        failed += 1;
        misses.push(`${fx.file}: expected no match, parsed as ${result.transaction.type}`);
      }
      continue;
    }

    checked += FIELDS.length;
    if (!result.ok) {
      failed += FIELDS.length;
      misses.push(`${fx.file}: failed (${result.reason}), all ${FIELDS.length} fields missed`);
      continue;
    }
    for (const field of FIELDS) {
      const want = (fx.expected as Partial<ParsedTransaction>)[field];
      const got = result.transaction[field];
      if (want !== got) {
        failed += 1;
        misses.push(`${fx.file}: ${field} expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
      }
    }
  }

  const accuracy = 1 - failed / checked;
  if (misses.length) console.log(`Parser accuracy ${(accuracy * 100).toFixed(2)}%\n${misses.join('\n')}`);
  expect(accuracy).toBeGreaterThanOrEqual(ACCURACY_GATE);
});
