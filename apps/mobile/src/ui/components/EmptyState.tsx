import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { space, useColors } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export function EmptyState({ icon, title, body, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', padding: space.xxl, gap: space.sm }}>
      <Ionicons name={icon} size={40} color={c.muted} />
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text muted style={{ textAlign: 'center' }}>
        {body}
      </Text>
      {action && <Button title={action} onPress={onAction} style={{ marginTop: space.md }} />}
    </View>
  );
}
