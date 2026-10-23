import * as LocalAuthentication from 'expo-local-authentication';

// FR-6.1. Unlocking uses the phone's own screen lock: fingerprint, falling back to the phone's PIN, pattern or password.
// That keeps the secret in Android's hardware-backed store instead of a second PIN kept by Ledgr.

// A screen lock (biometric or PIN/pattern/password) must exist for the app lock to mean anything.
export async function phoneHasScreenLock(): Promise<boolean> {
  return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
}

export async function authenticate(prompt: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: 'Cancel', disableDeviceFallback: false });
  return result.success;
}
