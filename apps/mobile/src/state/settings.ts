import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Preferences only. Financial data never goes into AsyncStorage; it belongs in the encrypted database.
export interface SettingsState {
  onboarded: boolean;
  dataSource: 'demo' | 'sms' | null;
  providers: string[];
  currency: string;
  monthStartDay: number;
  smsCursor: number; // received-at of the newest inbox SMS already processed
  wallet: string; // 'all', or a provider id to show one wallet's money only
  setProviders: (providers: string[]) => void;
  completeOnboarding: (source: 'demo' | 'sms') => void;
  setMonthStartDay: (day: number) => void;
  setSmsCursor: (at: number) => void;
  setWallet: (wallet: string) => void;
  reset: () => void;
}

const initial = {
  onboarded: false,
  dataSource: null,
  providers: ['mtn_momo'],
  currency: 'GHS',
  monthStartDay: 1,
  smsCursor: 0,
  wallet: 'all',
} satisfies Partial<SettingsState>;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...initial,
      setProviders: (providers) => set({ providers }),
      completeOnboarding: (dataSource) => set({ onboarded: true, dataSource }),
      setMonthStartDay: (monthStartDay) => set({ monthStartDay: Math.min(28, Math.max(1, monthStartDay)) }),
      setSmsCursor: (smsCursor) => set({ smsCursor }),
      setWallet: (wallet) => set({ wallet }),
      reset: () => set(initial),
    }),
    { name: 'ledgr-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
