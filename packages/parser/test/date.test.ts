import { parseDate } from '../src/date';

test('parses yyyy-MM-dd HH:mm:ss as local time', () => {
  expect(parseDate('2026-10-20 14:32:11', 'yyyy-MM-dd HH:mm:ss')).toBe(new Date(2026, 9, 20, 14, 32, 11).getTime());
});

test('parses dd/MM/yy HH:mm', () => {
  expect(parseDate('05/01/26 08:07', 'dd/MM/yy HH:mm')).toBe(new Date(2026, 0, 5, 8, 7).getTime());
});

test('rejects mismatched and impossible dates', () => {
  expect(parseDate('20-10-2026', 'yyyy-MM-dd')).toBeNaN();
  expect(parseDate('2026-02-30', 'yyyy-MM-dd')).toBeNaN();
});
