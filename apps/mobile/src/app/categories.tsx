import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import type { Category } from '@/db/schema';
import { useLedger } from '@/state/ledger';
import { Button, Card, CategoryIcon, Screen, Text } from '@/ui/components';
import { radius, space, useColors } from '@/ui/theme';

const PALETTE = ['#E8833A', '#3B82C4', '#D4A017', '#8B5CF6', '#DB4F8A', '#14A39A', '#2E9E5B', '#9A6B4F', '#5B7FD6', '#8A8F98'];

// FR-3.4: create, rename, recolor and delete categories.
export default function CategoriesScreen() {
  const c = useColors();
  const { categories, transactions, addCategory, updateCategory, deleteCategory } = useLedger();
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const remove = (cat: Category) => {
    const count = transactions.filter((t) => t.categoryId === cat.id).length;
    Alert.alert(`Delete ${cat.name}?`, count ? `${count} transactions will move to Other.` : undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(cat.id) },
    ]);
  };

  const input = { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md, color: c.text, fontSize: 15 };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Card style={{ paddingVertical: space.xs }}>
        {categories.map((cat, i) => {
          const open = editing === cat.id;
          return (
            <View key={cat.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: c.border, paddingVertical: space.md, gap: space.md }}>
              <Pressable onPress={() => setEditing(open ? null : cat.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <CategoryIcon category={cat} size={36} />
                <Text variant="label" style={{ flex: 1 }}>
                  {cat.name}
                </Text>
                <Ionicons name={open ? 'chevron-up' : 'create-outline'} size={20} color={c.muted} />
              </Pressable>
              {open && (
                <View style={{ gap: space.md }}>
                  <TextInput
                    defaultValue={cat.name}
                    onEndEditing={(e) => e.nativeEvent.text.trim() && updateCategory(cat.id, { name: e.nativeEvent.text.trim() })}
                    accessibilityLabel="Category name"
                    style={input}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                    {PALETTE.map((color) => (
                      <Pressable
                        key={color}
                        accessibilityRole="button"
                        accessibilityLabel={`Colour ${color}`}
                        accessibilityState={{ selected: cat.color === color }}
                        onPress={() => updateCategory(cat.id, { color })}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: 3, borderColor: cat.color === color ? c.text : 'transparent' }}
                      />
                    ))}
                  </View>
                  {cat.id !== 'other' && <Button title="Delete category" kind="danger" onPress={() => remove(cat)} />}
                </View>
              )}
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="heading">New category</Text>
        <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Church, Hair, School fees" placeholderTextColor={c.muted} accessibilityLabel="New category name" style={input} />
        <Button
          title="Add"
          disabled={!newName.trim()}
          onPress={() => {
            addCategory({ name: newName.trim(), icon: 'pricetag', color: PALETTE[categories.length % PALETTE.length]!, kind: 'expense' });
            setNewName('');
          }}
        />
      </Card>
    </Screen>
  );
}
