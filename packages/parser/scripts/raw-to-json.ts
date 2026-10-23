// Converts `adb shell content query … --projection date:body` output (raw/<sender>.txt) to raw/<sender>.json.
// Usage: npx tsx scripts/raw-to-json.ts MobileMoney T-CASH
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const RAW = join(__dirname, '..', 'fixtures', 'raw');
for (const sender of process.argv.slice(2)) {
  const text = readFileSync(join(RAW, `${sender}.txt`), 'utf8');
  const rows = [...text.matchAll(/^Row: \d+ date=(\d+), body=([\s\S]*?)(?=^Row: \d+ |$(?![\s\S]))/gm)].map((m) => ({ date: Number(m[1]), body: m[2]!.trimEnd() }));
  writeFileSync(join(RAW, `${sender}.json`), JSON.stringify(rows));
  console.log(`${sender}: ${rows.length} messages`);
}
