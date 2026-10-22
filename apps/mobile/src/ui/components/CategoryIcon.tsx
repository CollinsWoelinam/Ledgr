import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import type { Category } from '@/db/schema';
import { useColors } from '../theme';

// Rounded-square tile tinted with the category colour.
export function CategoryIcon({ category, size = 40 }: { category?: Category; size?: number }) {
  const c = useColors();
  const color = category?.color ?? c.muted;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.35, backgroundColor: `${color}${c.categoryTint}`, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={(category?.icon ?? 'help-outline') as keyof typeof Ionicons.glyphMap} size={size * 0.5} color={color} />
    </View>
  );
}
