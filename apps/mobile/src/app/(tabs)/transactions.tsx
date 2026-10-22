import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, TextInput, View } from 'react-native';
import type { Transaction } from '@/db/schema';
import { formatDay } from '@/lib/format';
import { useLedger } from '@/state/ledger';
import { Card, Chip, EmptyState, Text, TransactionRow } from '@/ui/components';
import { radius, space, useColors } from '@/ui/theme';

type Direction = 'all' | 'out' | 'in';

// FR-5.3: search, filters, grouped by day. SectionList virtualizes, so 10k rows stay smooth.
export default function TransactionsScreen() {
  const c = useColors();
  const { transactions, categories, reviewQueue } = useLedger();
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<Direction>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = transactions.filter(
      (t) =>
        (direction === 'all' || t.direction === direction) &&
        (!categoryId || t.categoryId === categoryId) &&
        (!q || t.counterpartyName?.toLowerCase().includes(q) || t.counterpartyNumber?.includes(q) || t.externalRef?.includes(q)),
    );
    const groups = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const day = new Date(t.occurredAt).toDateString();
      groups.set(day, [...(groups.get(day) ?? []), t]);
    }
    return [...groups.values()].map((data) => ({ title: formatDay(data[0]!.occurredAt), data }));
  }, [transactions, query, direction, categoryId]);

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: space.md }}>
        <Ionicons name="search" size={18} color={c.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, number or ID"
          placeholderTextColor={c.muted}
          accessibilityLabel="Search transactions"
          style={{ flex: 1, paddingVertical: space.md, color: c.text, fontSize: 15 }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label="All" selected={direction === 'all'} onPress={() => setDirection('all')} />
        <Chip label="Money out" selected={direction === 'out'} onPress={() => setDirection('out')} />
        <Chip label="Money in" selected={direction === 'in'} onPress={() => setDirection('in')} />
        <View style={{ width: 1, backgroundColor: c.border }} />
        {categories.map((cat) => (
          <Chip key={cat.id} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(categoryId === cat.id ? null : cat.id)} />
        ))}
      </ScrollView>
      {reviewQueue.length > 0 && (
        <Link href="/review" asChild>
          <Pressable>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderColor: c.warn }}>
              <Ionicons name="alert-circle" size={20} color={c.warn} />
              <Text style={{ flex: 1 }}>{reviewQueue.length} unrecognised messages need review</Text>
              <Ionicons name="chevron-forward" size={18} color={c.muted} />
            </Card>
          </Pressable>
        </Link>
      )}
    </View>
  );

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
      sections={sections}
      keyExtractor={(t) => t.id}
      ListHeaderComponent={header}
      stickySectionHeadersEnabled
      initialNumToRender={20}
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor: c.bg, paddingTop: space.md, paddingBottom: space.xs }}>
          <Text variant="caption" muted style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <TransactionRow tx={item} />}
      ListEmptyComponent={<EmptyState icon="search" title="No matches" body="Try a different search or clear the filters." />}
    />
  );
}
