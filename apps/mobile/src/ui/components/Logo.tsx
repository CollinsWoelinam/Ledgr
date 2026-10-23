import Svg, { Path, Rect } from 'react-native-svg';

// The Ledgr mark (assets/brand/mark.svg): an SMS bubble holding ledger rows, a description then a right-aligned amount.
const BUBBLE = 'M232 352a120 120 0 0 1 120-120h320a120 120 0 0 1 120 120v260a120 120 0 0 1-120 120H372l-140 80z';
const ROWS: [number, number, number][] = [
  [350, 332, 196], [350, 572, 120],
  [446, 332, 136], [446, 512, 180],
  [542, 332, 226], [542, 602, 90],
];

// `tile` draws the app-icon square behind the mark.
export function Logo({ size = 32, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox={tile ? '0 0 1024 1024' : '200 200 624 640'} accessibilityRole="image" accessibilityLabel="Ledgr">
      {tile && <Rect width={1024} height={1024} rx={230} fill="#0E2A22" />}
      <Path d={BUBBLE} fill="#C9F26C" />
      {ROWS.map(([y, x, w]) => (
        <Rect key={`${y}-${x}`} x={x} y={y} width={w} height={48} rx={24} fill="#0E2A22" />
      ))}
    </Svg>
  );
}
