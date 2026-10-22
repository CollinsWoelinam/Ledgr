import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text } from '@/ui/components';
import { space, useColors } from '@/ui/theme';

// FR-1.1: earn trust before asking for SMS access.
const SLIDES = [
  { icon: 'chatbubbles', title: 'Your MoMo alerts, organised', body: 'Ledgr reads your mobile money SMS and turns them into a spending record. No typing.' },
  { icon: 'lock-closed', title: 'Your SMS never leave this phone', body: 'Messages are read on your device. Nothing is uploaded unless you turn on encrypted backup.' },
  { icon: 'pie-chart', title: 'See where your money goes', body: 'Automatic categories, monthly budgets and a clear view of fees you pay.' },
] as const;

export default function WelcomeScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);
  const last = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, padding: space.xxl, justifyContent: 'center', gap: space.lg }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.icon} size={42} color={c.primary} />
            </View>
            <Text variant="display">{item.title}</Text>
            <Text muted style={{ fontSize: 17, lineHeight: 24 }}>
              {item.body}
            </Text>
          </View>
        )}
      />
      <View style={{ padding: space.xl, gap: space.lg }}>
        <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'center' }} accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={{ width: i === index ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? c.primary : c.track }} />
          ))}
        </View>
        <Button
          title={last ? 'Get started' : 'Next'}
          onPress={() => {
            if (last) return router.push('/permissions');
            list.current?.scrollToIndex({ index: index + 1 });
            setIndex(index + 1);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
