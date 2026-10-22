import { normalize } from '../src/normalize';

test('collapses whitespace and unifies cedi symbols', () => {
  expect(normalize('  Paid  GH₵ 5.00\nto  X ')).toBe('Paid GHS 5.00 to X');
  expect(normalize('GHC 5.00 and ¢3')).toBe('GHS 5.00 and GHS3');
});

test('joins space-separated thousands', () => {
  expect(normalize('GHS 1 250.00')).toBe('GHS 1250.00');
});
