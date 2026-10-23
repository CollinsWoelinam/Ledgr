import { useColorScheme } from 'react-native';

// Tokens from the redesign mockups. Text tokens keep ≥ 4.5:1 contrast on the surface they sit on (FR-6.4).
const light = {
  bg: '#F1F2EE',
  surface: '#FFFFFF',
  surfaceAlt: '#E3E6E0',
  ink: '#0D1714',
  muted: '#56635D',
  placeholder: '#6B7771',
  line: '#E2E5DF',
  divider: '#EEF0EB',
  chipBorder: '#D9DDD6',
  track: '#E7EAE4',

  // Dark green hero cards, same in both themes.
  hero: '#0E2A22',
  heroAlt: '#143A2F',
  heroTrack: '#1F4A3D',
  heroText: '#F3F7F4',
  heroMuted: '#A9C2B8',

  accent: '#C9F26C',
  onAccent: '#0D1714',
  inverse: '#0D1714',
  onInverse: '#FFFFFF',

  positive: '#157347',
  over: '#C2410C',
  onOver: '#FFFFFF',
  overSoft: '#F2C9B5',
  warnBar: '#E9A23B',
  warnSoft: '#FCE9C6',
  warnInk: '#7A4A00',
  okSoft: '#DCEFE7',
  okInk: '#0B5D4B',
  noticeBg: '#FFF4E6',
  noticeBorder: '#F6D3A8',
  noticeInk: '#B4480A',
  onNotice: '#FFFFFF',
  dangerBg: '#FFF6F1',
  dangerBorder: '#F0C9B8',
  danger: '#B4360A',
  highlight: '#E4F6BE',

  tabBar: '#0D1714',
  tabIcon: '#B8C4BF',
  categoryTint: '22', // hex alpha appended to a category colour for its icon tile
};

const dark: typeof light = {
  bg: '#0A110F',
  surface: '#131C19',
  surfaceAlt: '#1E2925',
  ink: '#EDF2EF',
  muted: '#9BAAA3',
  placeholder: '#7D8B85',
  line: '#233029',
  divider: '#1E2925',
  chipBorder: '#2C3833',
  track: '#24302B',

  hero: '#10312A',
  heroAlt: '#174036',
  heroTrack: '#24524A',
  heroText: '#F3F7F4',
  heroMuted: '#A9C2B8',

  accent: '#C9F26C',
  onAccent: '#0D1714',
  inverse: '#EDF2EF',
  onInverse: '#0D1714',

  positive: '#5CCB8E',
  over: '#F08A5D',
  onOver: '#2A1208',
  overSoft: '#4A2A1E',
  warnBar: '#E9A23B',
  warnSoft: '#3D2E12',
  warnInk: '#F2C27A',
  okSoft: '#163A2F',
  okInk: '#7FD8B4',
  noticeBg: '#2A2114',
  noticeBorder: '#4A3820',
  noticeInk: '#F0A35E',
  onNotice: '#2A1A0A',
  dangerBg: '#2A1712',
  dangerBorder: '#4A2A1E',
  danger: '#F08A5D',
  highlight: '#33461A',

  tabBar: '#1C2723',
  tabIcon: '#9BAAA3',
  categoryTint: '33',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

// Room the floating tab bar needs at the bottom of tab screens.
export const TAB_BAR_CLEARANCE = 104;

// Android ignores fontWeight with custom fonts, so each weight is its own family.
export const fonts = {
  body: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_600SemiBold' },
  display: { regular: 'SpaceGrotesk_500Medium', medium: 'SpaceGrotesk_500Medium', semibold: 'SpaceGrotesk_600SemiBold', bold: 'SpaceGrotesk_700Bold' },
} as const;

export type Weight = keyof typeof fonts.body;
