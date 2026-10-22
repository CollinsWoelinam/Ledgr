import { dedupeKey, parseSms, type EngineConfig } from '../src';

const config: EngineConfig = {
  providers: [{ id: 'p', name: 'P', senderIds: ['PayCo'], currency: 'GHS' }],
  templates: [
    { provider: 'p', version: 2, type: 'transfer_out', pattern: 'Sent {cur} ?(?<amount>{amount}) to (?<name>.+?)\\. Ref (?<ref>\\d+)' },
  ],
};
const sms = (sender: string, body: string) => ({ sender, body, receivedAt: 1_000 });

test('ignores senders outside the allowlist', () => {
  expect(parseSms(sms('Bank', 'Sent GHS 5 to A. Ref 1'), config)).toEqual({ ok: false, reason: 'unknown_sender' });
});

test('sender match is case-insensitive', () => {
  expect(parseSms(sms('payco', 'Sent GHS 5 to A. Ref 1'), config).ok).toBe(true);
});

test('unmatched provider messages are reported for the review queue', () => {
  expect(parseSms(sms('PayCo', 'Your OTP is 1234'), config)).toEqual({ ok: false, reason: 'no_template_match' });
});

test('zero amounts are invalid', () => {
  expect(parseSms(sms('PayCo', 'Sent GHS 0.00 to A. Ref 1'), config)).toEqual({ ok: false, reason: 'invalid' });
});

test('maps fields with provider defaults', () => {
  const result = parseSms(sms('PayCo', 'Sent GHS 5.5 to Ama. Ref 99'), config);
  expect(result).toEqual({
    ok: true,
    transaction: expect.objectContaining({
      provider: 'p', templateVersion: 2, direction: 'out', amountMinor: 550, feeMinor: 0,
      currency: 'GHS', counterpartyName: 'Ama', externalRef: '99', occurredAt: 1_000,
    }),
  });
});

test('dedupe keys: ref, then reversal ref, then hash', () => {
  const base = { provider: 'p', templateVersion: 1, type: 'transfer_out', direction: 'out', amountMinor: 1, feeMinor: 0, taxMinor: 0, currency: 'GHS', occurredAt: 5 } as const;
  expect(dedupeKey({ ...base, externalRef: '9' })).toBe('p:ref:9');
  expect(dedupeKey({ ...base, type: 'reversal', reversesRef: '9' })).toBe('p:rev:9');
  expect(dedupeKey({ ...base, counterpartyName: 'A' })).toBe('p:h:1:5:A');
});
