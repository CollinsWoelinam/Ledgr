# SMS fixture corpus

One JSON file per sample, grouped by provider:

```json
{
  "description": "what this sample covers",
  "synthetic": true,
  "sms": { "sender": "MobileMoney", "body": "...", "receivedAt": "2026-10-20T14:32:15" },
  "expected": { "type": "transfer_out", "amountMinor": 4500, "...": "..." }
}
```

- `receivedAt` and `expected.occurredAt` are local-time ISO strings (no `Z`), so tests pass in any timezone.
- `expected: null` means the message must not parse (promos, OTPs, balance enquiries).
- `synthetic: true` marks made-up samples. Replace them with real, anonymized ones: change names to
  fake ones, keep the last 3 digits of numbers, keep amounts and wording exactly.
- Target: 50+ samples per supported provider. Put un-anonymized samples in `raw/` (git-ignored) only.
