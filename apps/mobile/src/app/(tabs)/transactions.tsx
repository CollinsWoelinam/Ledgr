import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Transaction } from '@/db/schema';
import { summarize } from '@/features/insights/queries';
import { formatAmount, formatDay } from '@/lib/format';
import { usePeriod, useReviewCount, useWalletTransactions } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Card, Chip, EmptyState, IconButton, ScreenHeader, Text, TransactionRow, WalletSwitcher } from '@/ui/components';
import { fonts, space, TAB_BAR_CLEARANCE, useColors } from '@/ui/theme';

type Direction = 'all' | 'out' | 'in';

interface DaySection {
  title: string;
  outMinor: number;
  inMinor: number;
  data: Transaction[];
}

// FR-5.3: search, filters, grouped by day. SectionList virtualizes, so 10k rows stay smooth.
export default function ActivityScreen() {
  const c = useColors();
  const period = usePeriod();
  const currency = useSettings((s) => s.currency);
  const categories = useLedger((s) => s.categories);
  const review = useReviewCount();
  const { transactions } = useWalletTransactions();
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<Direction>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  const month = useMemo(() => summarize(transactions, period), [transactions, period]);
  const monthName = new Date(period.start).toLocaleDateString('en-GB', { month: 'long' });

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = new Map<string, DaySection>();
    for (const t of transactions) {
      if (direction !== 'all' && t.direction !== direction) continue;
      if (categoryId && t.categoryId !== categoryId) continue;
      if (q && !(t.counterpartyName?.toLowerCase().includes(q) || t.counterpartyNumber?.includes(q) || t.externalRef?.includes(q))) continue;
      const key = new Date(t.occurredAt).toDateString();
      const section = groups.get(key) ?? { title: formatDay(t.occurredAt), outMinor: 0, inMinor: 0, data: [] };
      section.data.push(t);
      if (t.direction === 'out') section.outMinor += t.amountMinor;
      else section.inMinor += t.amountMinor;
      groups.set(key, section);
    }
    return [...groups.values()];
  }, [transactions, query, direction, categoryId]);

  const selectedCategory = categories.find((cat) => cat.id === categoryId);

  const header = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      <ScreenHeader title="Activity" right={<IconButton icon="add" label="Add transaction" filled onPress={() => router.push('/transaction/new')} />} />
      <WalletSwitcher />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 16 }}>
        <Ionicons name="search" size={18} color={c.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Name, number or transaction ID"
          placeholderTextColor={c.placeholder}
          accessibilityLabel="Search transactions"
          returnKeyType="search"
          style={{ flex: 1, height: '100%', color: c.ink, fontSize: 15, fontFamily: fonts.body.regular }}
        />
        {query.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={c.muted} />
          </Pressable>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="All" selected={direction === 'all'} onPress={() => setDirection('all')} />
        <Chip label="Money out" selected={direction === 'out'} onPress={() => setDirection('out')} />
        <Chip label="Money in" selected={direction === 'in'} onPress={() => setDirection('in')} />
        <Chip label={selectedCategory?.name ?? 'Category'} dot={selectedCategory?.color} selected={showCategories || !!categoryId} onPress={() => setShowCategories(!showCategories)} />
      </View>
      {showCategories && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -space.xl }}>
          <View style={{ width: space.xl - 8 }} />
          {categories.map((cat) => (
            <Chip key={cat.id} label={cat.name} dot={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(categoryId === cat.id ? null : cat.id)} />
          ))}
          <View style={{ width: space.xl - 8 }} />
        </ScrollView>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, gap: 2 }}>
          <Text variant="caption" muted>
            Out in {monthName}
          </Text>
          <Text numeric weight="semibold" size={18} numberOfLines={1} adjustsFontSizeToFit>
            {currency} {formatAmount(month.outMinor)}
          </Text>
        </Card>
        <Card style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, gap: 2 }}>
          <Text variant="caption" muted>
            In in {monthName}
          </Text>
          <Text numeric weight="semibold" size={18} color={c.positive} numberOfLines={1} adjustsFontSizeToFit>
            {currency} {formatAmount(month.inMinor)}
          </Text>
        </Card>
      </View>

      {review.total > 0 && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/review')}>
          <Card tone="notice" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18 }}>
            <View style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: c.noticeInk, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="caption" weight="bold" color={c.onNotice}>
                {review.total}
              </Text>
            </View>
            <Text style={{ flex: 1 }}>To review: {review.summary}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </Card>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: TAB_BAR_CLEARANCE }}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 6, paddingHorizontal: 4 }}>
            <Text variant="overline" muted>
              {section.title}
            </Text>
            <Text variant="caption" numeric weight="medium" muted>
              {[section.outMinor ? `−${formatAmount(section.outMinor)}` : '', section.inMinor ? `+${formatAmount(section.inMinor)}` : ''].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}
        // Rows of one day share a card: round the first and last.
        renderItem={({ item, index, section }) => (
          <View
            style={{
              backgroundColor: c.surface,
              borderColor: c.line,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderTopWidth: index === 0 ? 1 : 0,
              borderBottomWidth: index === section.data.length - 1 ? 1 : 0,
              borderTopLeftRadius: index === 0 ? 22 : 0,
              borderTopRightRadius: index === 0 ? 22 : 0,
              borderBottomLeftRadius: index === section.data.length - 1 ? 22 : 0,
              borderBottomRightRadius: index === section.data.length - 1 ? 22 : 0,
              paddingHorizontal: 14,
            }}
          >
            <TransactionRow tx={item} divider={index > 0} />
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="search" title="No matches" body="Try a different search or clear the filters." />}
      />
    </SafeAreaView>
  );
}
