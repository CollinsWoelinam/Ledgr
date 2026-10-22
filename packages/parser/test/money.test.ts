import { toMinorUnits } from '../src/money';

test.each([
  ['45', 4500],
  ['45.5', 4550],
  ['45.00', 4500],
  ['1,234.56', 123456],
  ['0.45', 45],
  ['120.50.', 12050],
])('toMinorUnits(%s) = %d', (input, expected) => {
  expect(toMinorUnits(input)).toBe(expected);
});

test('rejects garbage', () => {
  expect(toMinorUnits('abc')).toBeNaN();
  expect(toMinorUnits('1.2.3')).toBeNaN();
});
