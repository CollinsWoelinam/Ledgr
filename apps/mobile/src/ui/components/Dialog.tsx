import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useLockState } from '@/features/security/useAppLock';
import { useColors } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

// Ledgr's own confirmations and notices, as a bottom sheet like its other sheets, instead of the system dialog.
// Called like Alert.alert: showDialog(title, message, buttons).

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogSpec {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

const useDialog = create<{ current: DialogSpec | null }>(() => ({ current: null }));

export function showDialog(title: string, message?: string, buttons: DialogButton[] = [{ text: 'OK', style: 'cancel' }]): void {
  useDialog.setState({ current: { title, message, buttons } });
}

// Rendered once, at the root. Never shown over the lock screen.
export function DialogHost() {
  const c = useColors();
  const current = useDialog((s) => s.current);
  const locked = useLockState((s) => s.locked);
  if (!current || locked) return null;

  const close = (button?: DialogButton) => {
    useDialog.setState({ current: null });
    button?.onPress?.();
  };
  const cancel = current.buttons.find((b) => b.style === 'cancel');
  const actions = current.buttons.filter((b) => b !== cancel);
  const destructive = actions.some((b) => b.style === 'destructive');

  return (
    <Modal transparent animationType="slide" onRequestClose={() => close(cancel)} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: '#0D171488' }} onPress={() => close(cancel)} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <View style={{ padding: 24, gap: 16 }} accessibilityViewIsModal>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.chipBorder }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: destructive ? c.dangerBg : c.okSoft }}>
              <Ionicons name={destructive ? 'trash-outline' : 'information-circle-outline'} size={22} color={destructive ? c.danger : c.okInk} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="title" size={22} accessibilityRole="header">
                {current.title}
              </Text>
              {current.message ? (
                <Text size={15} muted style={{ lineHeight: 22 }}>
                  {current.message}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ gap: 10 }}>
            {actions.map((b, i) => (
              <Button key={b.text} title={b.text} kind={b.style === 'destructive' ? 'danger' : i === 0 ? 'primary' : 'dashed'} onPress={() => close(b)} />
            ))}
            {cancel && <Button title={cancel.text} kind={actions.length ? 'ghost' : 'primary'} onPress={() => close(cancel)} />}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
