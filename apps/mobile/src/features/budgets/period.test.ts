import { inPeriod, periodContaining } from './period';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day).getTime();

test('calendar month when the period starts on the 1st', () => {
  expect(periodContaining(new Date(2026, 9, 20), 1)).toEqual({ start: d(2026, 10, 1), end: d(2026, 11, 1) });
});

test('payday on the 25th: before the 25th belongs to the previous period', () => {
  expect(periodContaining(new Date(2026, 9, 20), 25)).toEqual({ start: d(2026, 9, 25), end: d(2026, 10, 25) });
  expect(periodContaining(new Date(2026, 9, 25, 8), 25)).toEqual({ start: d(2026, 10, 25), end: d(2026, 11, 25) });
});

test('offset moves whole periods, across year boundaries', () => {
  expect(periodContaining(new Date(2026, 0, 10), 1, -1)).toEqual({ start: d(2025, 12, 1), end: d(2026, 1, 1) });
});

test('start day clamps to the end of short months', () => {
  expect(periodContaining(new Date(2026, 1, 28, 12), 31).start).toBe(d(2026, 2, 28));
});

test('end is exclusive', () => {
  const p = periodContaining(new Date(2026, 9, 20), 1);
  expect(inPeriod(p.start, p)).toBe(true);
  expect(inPeriod(p.end, p)).toBe(false);
});
