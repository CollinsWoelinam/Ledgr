import { Redirect, Stack } from 'expo-router';
import { useSettings } from '@/state/settings';

export default function OnboardingLayout() {
  const onboarded = useSettings((s) => s.onboarded);
  if (onboarded) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
