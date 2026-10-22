import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ParsedTransaction, RawSms } from '../src/types';

export interface Fixture {
  file: string;
  description: string;
  synthetic: boolean;
  sms: RawSms;
  expected: Omit<ParsedTransaction, 'templateVersion'> | null;
}

const ROOT = join(__dirname, '..', 'fixtures');

// Fixture times are local ISO strings so the suite is timezone-independent.
export function loadFixtures(): Fixture[] {
  return readdirSync(ROOT)
    .filter((dir) => dir !== 'raw' && statSync(join(ROOT, dir)).isDirectory())
    .flatMap((dir) =>
      readdirSync(join(ROOT, dir))
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          const raw = JSON.parse(readFileSync(join(ROOT, dir, f), 'utf8'));
          return {
            file: `${dir}/${f}`,
            description: raw.description,
            synthetic: raw.synthetic ?? false,
            sms: { ...raw.sms, receivedAt: new Date(raw.sms.receivedAt).getTime() },
            expected: raw.expected && { ...raw.expected, occurredAt: new Date(raw.expected.occurredAt).getTime() },
          };
        }),
    );
}
