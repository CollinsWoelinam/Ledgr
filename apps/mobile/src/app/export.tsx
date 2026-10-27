import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { periodContaining, type Period } from '@/features/budgets/period';
import { inScope, toCsv, toStatementHtml, type ExportScope } from '@/features/export/format';
import { shareCsv, sharePdf } from '@/features/export/share';
import { summarize } from '@/features/insights/queries';
import { formatMoney } from '@/lib/format';
import { useWallets } from '@/state/hooks';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { Button, Card, Chip, Screen, ScreenHeader, showDialog, Text } from '@/ui/components';

type Range = 'month' | 'lastMonth' | 'quarter' | 'year' | 'all';
const RANGES: [Range, string][] = [
  ['month', 'This month'],
  ['lastMonth', 'Last month'],
  ['quarter', 'Last 3 months'],
  ['year', 'This year'],
  ['all', 'Everything'],
];

// US-13: export transactions as CSV (spreadsheets) or a PDF statement, through the phone's share menu.
export default function ExportScreen() {
  const { transactions, categories } = useLedger();
  const { monthStartDay, currency } = useSettings();
  const wallets = useWallets();
  const [range, setRange] = useState<Range>('month');
  const [wallet, setWallet] = useState<string | null>(null);
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [busy, setBusy] = useState(false);
  const [now] = useState(Date.now);

  const scope: ExportScope = useMemo(() => {
    const period = periodFor(range, new Date(now), monthStartDay);
    return { period, label: labelFor(period, range), wallets: wallet ? [wallet] : null };
  }, [range, wallet, now, monthStartDay]);
  const chosen = useMemo(() => inScope(transactions, scope), [transactions, scope]);
  const totals = useMemo(() => summarize(chosen, scope.period), [chosen, scope]);

  const share = async () => {
    setBusy(true);
    try {
      const name = `ledgr-${fileDate(scope.period.start)}-to-${fileDate(scope.period.end - 1)}`;
      if (format === 'csv') await shareCsv(name, toCsv(chosen, categories));
      else await sharePdf(name, toStatementHtml(chosen, categories, scope, currency));
    } catch (e) {
      showDialog('Export didn’t work', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Export" back />

      <Group label="Period">
        {RANGES.map(([id, label]) => (
          <Chip key={id} label={label} selected={range === id} onPress={() => setRange(id)} />
        ))}
      </Group>

      {wallets.length > 1 && (
        <Group label="Wallet">
          <Chip label="All wallets" selected={wallet === null} onPress={() => setWallet(null)} />
          {wallets.map((w) => (
            <Chip key={w.id} label={w.name} selected={wallet === w.id} onPress={() => setWallet(w.id)} />
          ))}
        </Group>
      )}

      <Group label="Format">
        <Chip label="CSV for spreadsheets" selected={format === 'csv'} onPress={() => setFormat('csv')} />
        <Chip label="PDF statement" selected={format === 'pdf'} onPress={() => setFormat('pdf')} />
      </Group>

      <Card style={{ borderRadius: 22, gap: 4 }}>
        <Text variant="label" weight="semibold">
          {chosen.length} transaction{chosen.length === 1 ? '' : 's'} · {scope.label}
        </Text>
        <Text size={14} muted>
          {formatMoney(totals.outMinor, currency)} out · {formatMoney(totals.inMinor, currency)} in
        </Text>
      </Card>

      <Button title={busy ? 'Preparing…' : `Export ${format.toUpperCase()}`} disabled={busy || chosen.length === 0} onPress={share} />
      <Text variant="caption" muted style={{ textAlign: 'center', lineHeight: 18 }}>
        The file goes only where you send it from the share menu. It never includes your SMS text.
      </Text>
    </Screen>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" size={14}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function periodFor(range: Range, now: Date, startDay: number): Period {
  const month = periodContaining(now, startDay);
  switch (range) {
    case 'month':
      return month;
    case 'lastMonth':
      return periodContaining(now, startDay, -1);
    case 'quarter':
      return { start: periodContaining(now, startDay, -2).start, end: month.end };
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1).getTime(), end: new Date(now.getFullYear() + 1, 0, 1).getTime() };
    case 'all':
      return { start: 0, end: month.end };
  }
}

function labelFor(period: Period, range: Range): string {
  if (range === 'all') return 'All time';
  const f = (at: number) => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f(period.start)} – ${f(period.end - 1)}`;
}

function fileDate(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
