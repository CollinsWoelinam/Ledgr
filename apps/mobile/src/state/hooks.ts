import { useMemo } from 'react';
import { periodContaining, type Period } from '@/features/budgets/period';
import { useSettings } from './settings';

export function usePeriod(offset = 0): Period {
  const startDay = useSettings((s) => s.monthStartDay);
  return useMemo(() => periodContaining(new Date(), startDay, offset), [startDay, offset]);
}

export function periodLabel(period: Period): string {
  const start = new Date(period.start);
  const endInclusive = new Date(period.end - 1);
  if (start.getDate() === 1) return start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(endInclusive)}`;
}
