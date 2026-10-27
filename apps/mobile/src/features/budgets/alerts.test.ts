import { alertKey, alertMessage, crossedKeys, dueAlerts, keysForPeriod } from './alerts';
import type { BudgetProgress } from './progress';

const period = { start: 1_000, end: 2_000 };
const p = (categoryId: string | null, spentMinor: number, limitMinor = 10000): BudgetProgress => ({ categoryId, spentMinor, limitMinor, ratio: spentMinor / limitMinor });

test('nothing is due below 80%', () => {
  expect(dueAlerts([p('food', 7999)], period, [])).toEqual([]);
});

test('80% is announced once', () => {
  const [alert] = dueAlerts([p('food', 8000)], period, []);
  expect(alert).toMatchObject({ threshold: 80, key: alertKey(period, 'food', 80) });
  expect(dueAlerts([p('food', 9000)], period, [alert!.key])).toEqual([]);
});

test('100% follows 80%, and jumping straight past 100% gives one alert', () => {
  expect(dueAlerts([p('food', 10000)], period, [alertKey(period, 'food', 80)])).toMatchObject([{ threshold: 100 }]);
  expect(dueAlerts([p('food', 12000)], period, [])).toMatchObject([{ threshold: 100 }]);
  expect(crossedKeys(p('food', 12000), period)).toEqual([alertKey(period, 'food', 80), alertKey(period, 'food', 100)]);
});

test('a new budget month starts fresh, and old keys are dropped', () => {
  const next = { start: 2_000, end: 3_000 };
  const sent = [alertKey(period, null, 80)];
  expect(dueAlerts([p(null, 8500)], next, sent)).toMatchObject([{ threshold: 80, key: alertKey(next, null, 80) }]);
  expect(keysForPeriod([...sent, alertKey(next, null, 80)], next)).toEqual([alertKey(next, null, 80)]);
});

test('messages say what was spent and what is left', () => {
  const [eighty] = dueAlerts([p('airtime', 8550)], period, []);
  expect(alertMessage(eighty!, 'Airtime & Data', 'GHS', 9)).toEqual({ title: 'Airtime & Data budget 85% used', body: 'GHS 14.50 left: GHS 85.50 of GHS 100.00 spent, 9 days left this month.' });
  const [over] = dueAlerts([p(null, 10250)], period, []);
  expect(alertMessage(over!, 'Overall', 'GHS', 1)).toEqual({ title: 'Overall budget used up', body: 'GHS 2.50 over: GHS 102.50 of GHS 100.00 spent, 1 day left this month.' });
});
