import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { IconButton } from './IconButton';
import { Text } from './Text';

// Tab screens get a large title; pushed screens get a back button and a small title.
export function ScreenHeader({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  if (back) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text variant="label" weight="semibold" style={{ flex: 1 }} accessibilityRole="header">
          {title}
        </Text>
        {right}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 44 }}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}
