import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Preferences only. Financial data never goes into AsyncStorage; it belongs in the encrypted database.
export type ThemeChoice = 'light' | 'dark';

export interface SettingsState {
  onboarded: boolean;
  dataSource: 'demo' | 'sms' | null;
  providers: string[];
  currency: string;
  monthStartDay: number;
  smsCursor: number; // received-at of the newest inbox SMS already processed
  parsedWith: string | null; // templates revision the inbox was last read with
  wallet: string; // 'all', or a provider id to show one wallet's money only
  theme: ThemeChoice | null; // null until the user picks: the app follows the phone's light/dark mode
  appLock: boolean;
  lockAfterMs: number; // how long the app may be in the background before it locks again
  setProviders: (providers: string[]) => void;
  completeOnboarding: (source: 'demo' | 'sms') => void;
  setMonthStartDay: (day: number) => void;
  setSmsCursor: (at: number) => void;
  setParsedWith: (revision: string) => void;
  setWallet: (wallet: string) => void;
  setTheme: (theme: ThemeChoice) => void;
  setAppLock: (on: boolean) => void;
  setLockAfterMs: (ms: number) => void;
  reset: () => void;
}

const initial = {
  onboarded: false,
  dataSource: null,
  providers: ['mtn_momo'],
  currency: 'GHS',
  monthStartDay: 1,
  smsCursor: 0,
  parsedWith: null,
  wallet: 'all',
  theme: null,
  appLock: false,
  lockAfterMs: 0,
} satisfies Partial<SettingsState>;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...initial,
      setProviders: (providers) => set({ providers }),
      completeOnboarding: (dataSource) => set({ onboarded: true, dataSource }),
      setMonthStartDay: (monthStartDay) => set({ monthStartDay: Math.min(28, Math.max(1, monthStartDay)) }),
      setSmsCursor: (smsCursor) => set({ smsCursor }),
      setParsedWith: (parsedWith) => set({ parsedWith }),
      setWallet: (wallet) => set({ wallet }),
      setTheme: (theme) => set({ theme }),
      setAppLock: (appLock) => set({ appLock }),
      setLockAfterMs: (lockAfterMs) => set({ lockAfterMs }),
      reset: () => set(initial),
    }),
    {
      name: 'ledgr-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 stored theme 'system'; that now means no choice yet.
      migrate: (persisted, version) => {
        const state = persisted as Omit<Partial<SettingsState>, 'theme'> & { theme?: string | null };
        if (version < 1 && state.theme === 'system') state.theme = null;
        return state as SettingsState;
      },
    },
  ),
);
