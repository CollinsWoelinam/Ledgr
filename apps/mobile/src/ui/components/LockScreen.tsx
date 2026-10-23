import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLockState } from '@/features/security/useAppLock';
import { useColors } from '../theme';
import { Button } from './Button';
import { Logo } from './Logo';
import { Text } from './Text';

// Covers everything while locked. Asks right away; the button is there after a cancel.
export function LockScreen() {
  const c = useColors();
  const unlock = useLockState((s) => s.unlock);
  const authenticating = useLockState((s) => s.authenticating);

  useEffect(() => {
    unlock();
  }, [unlock]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B221C', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }]} accessibilityViewIsModal>
      <StatusBar style="light" />
      <Logo size={72} />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text variant="title" size={26} color={c.heroText} accessibilityRole="header">
          Ledgr is locked
        </Text>
        <Text size={15} color="#B9CDC5" style={{ textAlign: 'center' }}>
          Use your fingerprint or your phone’s screen lock.
        </Text>
      </View>
      <Button
        title={authenticating ? 'Waiting…' : 'Unlock'}
        kind="accent"
        disabled={authenticating}
        icon={<Ionicons name="finger-print" size={20} color={c.onAccent} />}
        onPress={unlock}
        style={{ alignSelf: 'stretch' }}
      />
    </View>
  );
}
