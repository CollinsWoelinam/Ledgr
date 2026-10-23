// When the app locks (FR-6.1). Kept free of native imports so it can be unit-tested.

export const LOCK_AFTER_OPTIONS = [
  { ms: 0, label: 'Immediately' },
  { ms: 60_000, label: 'After 1 min' },
  { ms: 300_000, label: 'After 5 min' },
] as const;

// Whether returning to the app should show the lock screen.
export function shouldLock(enabled: boolean, backgroundedAt: number | null, now: number, lockAfterMs: number): boolean {
  return enabled && backgroundedAt !== null && now - backgroundedAt >= lockAfterMs;
}
