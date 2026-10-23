import { shouldLock } from './lockPolicy';

test('locks only when enabled and away for at least the chosen time', () => {
  expect(shouldLock(true, 1_000, 1_000, 0)).toBe(true); // immediately
  expect(shouldLock(true, 1_000, 60_999, 60_000)).toBe(false);
  expect(shouldLock(true, 1_000, 61_000, 60_000)).toBe(true);
  expect(shouldLock(false, 1_000, 999_999, 0)).toBe(false);
});

test('never locks without having been in the background', () => {
  expect(shouldLock(true, null, 5_000, 0)).toBe(false);
});
