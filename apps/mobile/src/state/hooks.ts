import { useMemo } from 'react';
import { periodContaining, type Period } from '@/features/budgets/period';
import { useSettings } from './settings';

export function usePeriod(offset = 0): Period {
  const startDay = useSettings((s) => s.monthStartDay);
  return useMemo(() => periodContaining(new Date(), startDay, offset), [startDay, offset]);
}
