import { useColorScheme } from 'react-native';

// FR-6.4: light and dark themes. Text colors keep ≥ 4.5:1 contrast on bg and card.
const light = {
  bg: '#F6F5F2',
  card: '#FFFFFF',
  cardAlt: '#EFEDE8',
  text: '#16181B',
  muted: '#5F646C',
  border: '#E3E0D9',
  primary: '#0B6E55',
  primaryText: '#FFFFFF',
  primarySoft: '#DDEFE8',
  in: '#1E7F4A',
  danger: '#C23B3B',
  warn: '#A86A00',
  track: '#E8E5DF',
};

const dark: typeof light = {
  bg: '#0E1012',
  card: '#181B1F',
  cardAlt: '#22262B',
  text: '#F1F1EE',
  muted: '#A0A5AD',
  border: '#2A2E33',
  primary: '#3DBE94',
  primaryText: '#06231A',
  primarySoft: '#173A30',
  in: '#4CC283',
  danger: '#F07272',
  warn: '#F0B44C',
  track: '#2A2E33',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
