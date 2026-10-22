import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { useColors } from '../theme';

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onChange(!value);
      }}
      style={{ width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center', alignItems: value ? 'flex-end' : 'flex-start', backgroundColor: value ? c.inverse : c.chipBorder, opacity: disabled ? 0.45 : 1 }}
    >
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: value ? c.accent : c.surface }} />
    </Pressable>
  );
}
