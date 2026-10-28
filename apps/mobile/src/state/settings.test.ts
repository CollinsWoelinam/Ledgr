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

test('adding a wallet re-reads the inbox once, so its older messages come in too', () => {
  useSettings.setState({ providers: ['mtn_momo'], parsedWith: 'rev-1', smsCursor: 123 });
  useSettings.getState().setProviders(['mtn_momo', 'telecel_cash']);
  expect(useSettings.getState().parsedWith).toBeNull();
  useSettings.getState().reset();
});

test('removing a wallet keeps the saved position', () => {
  useSettings.setState({ providers: ['mtn_momo', 'telecel_cash'], parsedWith: 'rev-1' });
  useSettings.getState().setProviders(['mtn_momo']);
  expect(useSettings.getState().parsedWith).toBe('rev-1');
  useSettings.getState().reset();
});
