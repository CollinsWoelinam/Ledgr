import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Pressable, useColorScheme, View } from 'react-native';
import { useSettings, type ThemeChoice } from '@/state/settings';
import { useColors } from '../theme';

const OPTIONS: { value: ThemeChoice; icon: 'sunny' | 'moon'; label: string }[] = [
  { value: 'light', icon: 'sunny', label: 'Light theme' },
  { value: 'dark', icon: 'moon', label: 'Dark theme' },
];

// Sun and moon. Before the user picks, the one matching the phone is shown as selected (that's what the app follows).
export function ThemeToggle() {
  const c = useColors();
  const current = useColorScheme() === 'dark' ? 'dark' : 'light';
  const setTheme = useSettings((s) => s.setTheme);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Theme" style={{ flexDirection: 'row', backgroundColor: c.bg, borderRadius: 14, padding: 3, gap: 2 }}>
      {OPTIONS.map((o) => {
        const selected = current === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setTheme(o.value);
            }}
            style={{ width: 48, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.inverse : 'transparent' }}
          >
            <Ionicons name={selected ? o.icon : `${o.icon}-outline`} size={20} color={selected ? c.onInverse : c.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}
