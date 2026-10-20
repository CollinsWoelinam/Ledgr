import { toMinorUnits } from '../src/money';

test('converts to minor units', () => {
  expect(toMinorUnits('1,234.5')).toBe(123450);
  expect(toMinorUnits('45')).toBe(4500);
});
