import { bundledConfig, parseSms } from '@ledgr/parser';
import { seedDemoData } from './seed';

// Demo SMS must round-trip through the real parser, so the demo shows exactly what real messages would produce.
test('every demo SMS parses back into its transaction', () => {
  const { transactions } = seedDemoData(new Date(2026, 9, 22, 12));
  expect(transactions.length).toBeGreaterThan(100);

  for (const tx of transactions) {
    const result = parseSms({ sender: 'MobileMoney', body: tx.smsBody!, receivedAt: tx.occurredAt }, bundledConfig);
    if (!result.ok) throw new Error(`${result.reason}: ${tx.smsBody}`);
    const { templateVersion: _v, ...parsed } = result.transaction;
    expect(parsed).toEqual({
      provider: tx.provider, type: tx.type, direction: tx.direction, amountMinor: tx.amountMinor, feeMinor: tx.feeMinor,
      taxMinor: tx.taxMinor, currency: tx.currency, counterpartyName: tx.counterpartyName, counterpartyNumber: tx.counterpartyNumber,
      balanceAfterMinor: tx.balanceAfterMinor, externalRef: tx.externalRef, reversesRef: undefined, occurredAt: tx.occurredAt,
    });
  }
});

// The demo review queue shows messages a real phone would put there: from the wallet sender, not parseable.
test('demo review items really are unparseable wallet messages', () => {
  for (const item of seedDemoData(new Date(2026, 9, 22, 12)).reviewQueue) {
    expect(parseSms({ sender: item.sender, body: item.body, receivedAt: item.receivedAt }, bundledConfig)).toEqual({ ok: false, reason: 'no_template_match' });
  }
});
