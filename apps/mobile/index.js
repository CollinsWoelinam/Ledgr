// The app's entry point: Expo Router, plus the task Android runs when a wallet SMS arrives while Ledgr is closed.
import 'expo-router/entry';
import { AppRegistry } from 'react-native';
import { runBackgroundSync } from './src/features/sms/background';

AppRegistry.registerHeadlessTask('LedgrSmsArrived', () => runBackgroundSync);
