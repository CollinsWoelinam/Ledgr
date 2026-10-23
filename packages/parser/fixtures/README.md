# SMS fixture corpus

One JSON file per sample, grouped by provider:

```json
{
  "description": "transfer_out, mtn_momo template 3",
  "synthetic": false,
  "sms": { "sender": "MobileMoney", "body": "...", "receivedAt": "2026-03-25T14:41:00" },
  "expected": { "type": "transfer_out", "amountMinor": 3150, "...": "..." }
}
```

- Samples are **real messages, anonymized** by `scripts/make-fixtures.ts`: names, phone numbers, transaction IDs,
  amounts, dates, references and links are replaced with fake values in the same format. Public names
  (MTN AIRTIME, Bills.INV, GT Bank…) are kept because templates depend on them.
- `expected` is the parse of the **original** message with the same substitutions applied, so the test checks the
  parser on anonymized text against independently derived values.
- `receivedAt` and `expected.occurredAt` are local-time ISO strings (no `Z`), so tests pass in any timezone.
- `expected: null` means the message must not parse (OTPs, promos, balance checks, failed transfers).
- `t<N>_…` files come from template N of that provider; every template has samples.

## Updating from a phone

Raw exports go in `raw/` (git-ignored, never committed):

```sh
adb shell "content query --uri content://sms/inbox --projection date:body --where \"address='MobileMoney'\"" > raw/MobileMoney.txt
npx tsx scripts/raw-to-json.ts MobileMoney   # adb text → JSON
npx tsx scripts/real-corpus.ts     # match rate, unmatched shapes, balance-chain check
npx tsx scripts/make-fixtures.ts   # regenerate anonymized fixtures
```

`real-corpus.ts` also checks the balance chain (previous balance ± amount − fees = reported balance), which measures
accuracy on every real message without hand labelling.
