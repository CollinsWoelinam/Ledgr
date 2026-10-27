import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, ScrollView, TextInput, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space, TAB_BAR_CLEARANCE, useColors } from '../theme';

const ABOVE_KEYBOARD = 96; // room between a focused field and the keyboard, enough to show the button below it

// Scrollable page. `tab` leaves room for the floating tab bar.
// The app draws edge to edge, so Android no longer shrinks the window for the keyboard: while it's open the page
// gets that much extra room at the bottom, and the focused field is scrolled to just above it.
export function Screen({ children, tab, contentContainerStyle, onScroll, ...props }: ScrollViewProps & { children: ReactNode; tab?: boolean }) {
  const c = useColors();
  const scroll = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboard(e.endCoordinates.height);
      const field = TextInput.State.currentlyFocusedInput();
      // After the extra room has been laid out, bring the field above the keyboard if it's hidden behind it.
      requestAnimationFrame(() =>
        field?.measureInWindow((_x, y, _w, height) => {
          const hidden = y + height + ABOVE_KEYBOARD - e.endCoordinates.screenY;
          if (hidden > 0) scroll.current?.scrollTo({ y: offset.current + hidden, animated: true });
        }),
      );
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const track = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingHorizontal: space.xl, paddingTop: space.md, gap: 14, paddingBottom: (tab ? TAB_BAR_CLEARANCE : space.xxl) + keyboard }, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={track}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
