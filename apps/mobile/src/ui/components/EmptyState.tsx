import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { useColors } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export function EmptyState({ icon, title, body, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 8 }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Ionicons name={icon} size={30} color={c.muted} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text muted style={{ textAlign: 'center' }}>
        {body}
      </Text>
      {action && <Button title={action} small onPress={onAction} style={{ marginTop: 12 }} />}
    </View>
  );
}
