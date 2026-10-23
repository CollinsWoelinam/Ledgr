import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { useSettings } from '@/state/settings';
import { authenticate } from './appLock';
import { shouldLock } from './lockPolicy';

interface LockState {
  locked: boolean;
  started: boolean; // false until the launch check has run; the layout treats an enabled lock as locked until then
  authenticating: boolean;
  unlock: () => Promise<void>;
}

// Not persisted: a fresh launch always starts locked when the lock is on.
export const useLockState = create<LockState>()((set, get) => ({
  locked: false,
  started: false,
  authenticating: false,
  unlock: async () => {
    if (get().authenticating) return;
    if (await confirmWithLock('Unlock Ledgr')) set({ locked: false });
  },
}));

// Any prompt (unlocking, or confirming a Settings change) goes through here so the lifecycle ignores the
// background blip the system prompt can cause.
export async function confirmWithLock(prompt: string): Promise<boolean> {
  useLockState.setState({ authenticating: true });
  try {
    return await authenticate(prompt);
  } finally {
    useLockState.setState({ authenticating: false });
  }
}

// Locks on launch and on returning after the chosen time away.
export function useAppLockLifecycle(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    useLockState.setState({ locked: useSettings.getState().appLock, started: true });

    let backgroundedAt: number | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      // The system unlock prompt can briefly background the app on some phones; that's not leaving.
      if (useLockState.getState().authenticating) return;
      if (state === 'background') backgroundedAt = Date.now();
      if (state === 'active') {
        const { appLock, lockAfterMs } = useSettings.getState();
        if (shouldLock(appLock, backgroundedAt, Date.now(), lockAfterMs)) useLockState.setState({ locked: true });
        backgroundedAt = null;
      }
    });
    return () => sub.remove();
  }, [ready]);
}
