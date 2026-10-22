import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import type { Category } from '@/db/schema';

export function CategoryIcon({ category, size = 40 }: { category?: Category; size?: number }) {
  const color = category?.color ?? '#8A8F98';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}26`, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={(category?.icon ?? 'help') as keyof typeof Ionicons.glyphMap} size={size * 0.5} color={color} />
    </View>
  );
}
