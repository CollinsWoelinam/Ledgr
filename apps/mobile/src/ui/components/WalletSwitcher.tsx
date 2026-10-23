import { ScrollView } from 'react-native';
import { useWallets } from '@/state/hooks';
import { useSettings } from '@/state/settings';
import { Chip } from './Chip';

// All wallets, or just one. Shared by Home, Activity and Insights; hidden when there's only one wallet.
export function WalletSwitcher() {
  const wallets = useWallets();
  const selected = useSettings((s) => s.wallet);
  const setWallet = useSettings((s) => s.setWallet);
  if (wallets.length < 2) return null;
  const current = wallets.some((w) => w.id === selected) ? selected : 'all';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Wallet">
      <Chip label="All wallets" selected={current === 'all'} onPress={() => setWallet('all')} />
      {wallets.map((w) => (
        <Chip key={w.id} label={w.name} selected={current === w.id} onPress={() => setWallet(w.id)} />
      ))}
    </ScrollView>
  );
}
