import { dailyAllowance, daysLeft, elapsedRatio, paceStatus } from './pace';

const period = { start: new Date(2026, 9, 1).getTime(), end: new Date(2026, 10, 1).getTime() };
const oct22 = new Date(2026, 9, 22, 9).getTime();
const progress = (spent: number, limit: number) => ({ categoryId: null, spentMinor: spent, limitMinor: limit, ratio: spent / limit });

test('elapsed ratio and days left', () => {
  expect(elapsedRatio(period, oct22)).toBeCloseTo(0.69, 2);
  expect(daysLeft(period, oct22)).toBe(10); // 22nd (partial) through 31st
  expect(elapsedRatio(period, period.end + 1)).toBe(1);
});

test('daily allowance spreads what is left over the remaining days', () => {
  expect(dailyAllowance(progress(226750, 300000), period, oct22)).toBe(7325);
  expect(dailyAllowance(progress(350000, 300000), period, oct22)).toBe(0);
});

test('pace status', () => {
  expect(paceStatus(progress(697, 500), 0.7)).toBe('over');
  expect(paceStatus(progress(86, 100), 0.7)).toBe('nearly');
  expect(paceStatus(progress(76, 100), 0.7)).toBe('ahead');
  expect(paceStatus(progress(66, 100), 0.7)).toBe('onPace');
});
