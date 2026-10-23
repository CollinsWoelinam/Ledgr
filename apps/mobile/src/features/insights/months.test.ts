import type { Transaction } from '@/db/schema';
import { monthsWithData, offsetOf } from './months';

const now = new Date(2026, 9, 23, 12).getTime(); // 23 Oct 2026
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

test('calendar months: offsets count back across years', () => {
  expect(offsetOf(at(2026, 10, 1), now, 1)).toBe(0);
  expect(offsetOf(at(2026, 9, 30), now, 1)).toBe(-1);
  expect(offsetOf(at(2025, 12, 31), now, 1)).toBe(-10);
  expect(offsetOf(at(2022, 1, 15), now, 1)).toBe(-57);
});

test('payday months: the 24th belongs to the period that started on the 25th of the month before', () => {
  // Now (23 Oct) is in the period that began 25 Sep.
  expect(offsetOf(at(2026, 9, 25), now, 25)).toBe(0);
  expect(offsetOf(at(2026, 9, 24), now, 25)).toBe(-1);
});

test('months with data and the oldest one', () => {
  const tx = (occurredAt: number) => ({ occurredAt }) as Transaction;
  const { offsets, oldest } = monthsWithData([tx(at(2026, 10, 2)), tx(at(2026, 6, 1)), tx(at(2022, 1, 15))], now, 1);
  expect([...offsets].sort((a, b) => a - b)).toEqual([-57, -4, 0]);
  expect(oldest).toBe(-57);
  expect(monthsWithData([], now, 1)).toEqual({ offsets: new Set(), oldest: 0 });
});
