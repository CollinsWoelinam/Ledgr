import { View } from 'react-native';
import { useSettings } from '@/state/settings';
import { Screen, ScreenHeader, showDialog, Text, WalletPicker } from '@/ui/components';

// FR-1.3: change which wallets Ledgr reads, after first launch too.
export default function WalletsScreen() {
  const providers = useSettings((s) => s.providers);
  const setProviders = useSettings((s) => s.setProviders);

  const toggle = (id: string) => {
    if (!providers.includes(id)) return setProviders([...providers, id]);
    if (providers.length === 1) return showDialog('Keep at least one wallet', 'Ledgr needs a wallet to read. To stop it reading SMS altogether, use Delete all data in Settings.');
    setProviders(providers.filter((p) => p !== id));
  };

  return (
    <Screen>
      <ScreenHeader title="Wallets" back />
      <Text muted style={{ lineHeight: 22 }}>
        Ledgr only reads messages from the wallets you choose. Adding one also reads its messages already on your phone.
      </Text>
      <WalletPicker selected={providers} onToggle={toggle} />
      <View style={{ paddingHorizontal: 4 }}>
        <Text variant="caption" muted style={{ lineHeight: 18 }}>
          Turning a wallet off stops new messages being read. Transactions already recorded from it stay.
        </Text>
      </View>
    </Screen>
  );
}
