import { useSettings } from './settings';

const migrate = useSettings.persist.getOptions().migrate!;

test("a saved 'system' theme from v0 becomes 'not chosen yet', so the app keeps following the phone", async () => {
  expect(await migrate({ theme: 'system', currency: 'GHS' }, 0)).toEqual({ theme: null, currency: 'GHS' });
});

test('a saved light or dark choice is kept', async () => {
  expect(await migrate({ theme: 'dark' }, 0)).toEqual({ theme: 'dark' });
});

test('new installs start without a choice', () => {
  expect(useSettings.getState().theme).toBeNull();
});
