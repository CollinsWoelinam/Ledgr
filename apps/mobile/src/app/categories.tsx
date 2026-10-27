import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { Category } from '@/db/schema';
import { useLedger } from '@/state/ledger';
import { Button, Card, CategoryIcon, Screen, ScreenHeader, showDialog, Text } from '@/ui/components';
import { fonts, useColors } from '@/ui/theme';

const PALETTE = ['#F28C38', '#3B82F6', '#EAB308', '#8B5CF6', '#EC4899', '#14B8A6', '#22A05A', '#9A6B4F', '#6366F1', '#8A948F'];

// FR-3.4: create, rename, recolour and delete categories.
export default function CategoriesScreen() {
  const c = useColors();
  const { categories, transactions, rules, addCategory, updateCategory, deleteCategory } = useLedger();
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const userRules = rules.filter((r) => r.createdBy === 'user').length;

  const remove = (cat: Category) => {
    const count = transactions.filter((t) => t.categoryId === cat.id).length;
    showDialog(`Delete ${cat.name}?`, count ? `${count} transactions will move to Other.` : undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(cat.id) },
    ]);
  };

  const input = { height: 48, borderWidth: 1, borderColor: c.line, borderRadius: 16, paddingHorizontal: 14, color: c.ink, fontSize: 15, fontFamily: fonts.body.regular, backgroundColor: c.bg };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Categories & rules" back />
      {userRules > 0 && (
        <Text muted>
          {userRules} saved rule{userRules > 1 ? 's' : ''} from your corrections keep future transactions in the right place.
        </Text>
      )}

      <Card style={{ borderRadius: 24, paddingVertical: 4 }}>
        {categories.map((cat, i) => {
          const open = editing === cat.id;
          return (
            <View key={cat.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: c.divider, paddingVertical: 12, gap: 12 }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setEditing(open ? null : cat.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CategoryIcon category={cat} size={36} />
                <Text variant="label" style={{ flex: 1 }}>
                  {cat.name}
                </Text>
                <Ionicons name={open ? 'chevron-up' : 'create-outline'} size={20} color={c.muted} />
              </Pressable>
              {open && (
                <View style={{ gap: 12 }}>
                  <TextInput
                    defaultValue={cat.name}
                    onEndEditing={(e) => e.nativeEvent.text.trim() && updateCategory(cat.id, { name: e.nativeEvent.text.trim() })}
                    accessibilityLabel="Category name"
                    style={input}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {PALETTE.map((color) => (
                      <Pressable
                        key={color}
                        accessibilityRole="button"
                        accessibilityLabel={`Colour ${color}`}
                        accessibilityState={{ selected: cat.color === color }}
                        onPress={() => updateCategory(cat.id, { color })}
                        style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: color, borderWidth: 3, borderColor: cat.color === color ? c.ink : 'transparent' }}
                      />
                    ))}
                  </View>
                  {cat.id !== 'other' && <Button title="Delete category" kind="danger" small onPress={() => remove(cat)} style={{ alignSelf: 'flex-start' }} />}
                </View>
              )}
            </View>
          );
        })}
      </Card>

      <Card style={{ borderRadius: 24, gap: 12 }}>
        <Text variant="heading">New category</Text>
        <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Church, Hair, School fees" placeholderTextColor={c.placeholder} accessibilityLabel="New category name" style={input} />
        <Button
          title="Add category"
          disabled={!newName.trim()}
          onPress={() => {
            addCategory({ name: newName.trim(), icon: 'pricetag-outline', color: PALETTE[categories.length % PALETTE.length]!, kind: 'expense' });
            setNewName('');
          }}
        />
      </Card>
    </Screen>
  );
}
