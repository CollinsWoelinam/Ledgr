import { bundledConfig, dedupeKey, parseSms, templatesRevision, type EngineConfig } from '../src';

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

describe('ignore patterns', () => {
  const withIgnore: EngineConfig = { ...config, providers: [{ ...config.providers[0]!, ignore: ['^Promo', 'balance is'] }] };

  test('known non-transactions are ignored, not sent to review', () => {
    expect(parseSms(sms('PayCo', 'Promo! Get 20% bonus'), withIgnore)).toEqual({ ok: false, reason: 'ignored' });
  });

  test('templates win over ignore patterns', () => {
    expect(parseSms(sms('PayCo', 'Sent GHS 5 to A. Ref 1'), { ...withIgnore, providers: [{ ...withIgnore.providers[0]!, ignore: ['Sent'] }] }).ok).toBe(true);
  });

  test('a message with a transaction ID is never ignored, even if a pattern matches', () => {
    expect(parseSms(sms('PayCo', 'Promo payout of GHS 5. Transaction ID: 12345678.'), withIgnore)).toEqual({ ok: false, reason: 'no_template_match' });
  });
});

test('curly apostrophes are straightened before matching', () => {
  const curly: EngineConfig = { ...config, templates: [{ provider: 'p', version: 1, type: 'payment', pattern: "Y'ello\\. Paid {cur} ?(?<amount>{amount})" }] };
  expect(parseSms(sms('PayCo', 'Y’ello. Paid GHS 2.50'), curly).ok).toBe(true);
});

test('failed transactions are dropped even though they carry a transaction ID', () => {
  const withFailed: EngineConfig = { ...config, providers: [{ ...config.providers[0]!, failed: ['has failed'] }] };
  expect(parseSms(sms('PayCo', 'Your payment of GHS 80.00 has failed. Financial Transaction Id: 76550405509.'), withFailed)).toEqual({ ok: false, reason: 'ignored' });
});

test('templates revision changes when a template changes', () => {
  expect(templatesRevision(bundledConfig)).toBe(templatesRevision(bundledConfig));
  const edited = { ...bundledConfig, templates: [...bundledConfig.templates.slice(1)] };
  expect(templatesRevision(edited)).not.toBe(templatesRevision(bundledConfig));
});
