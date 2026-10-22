// FR-4.2: budget month starts on a configurable day (e.g. payday on the 25th).
// Days past the end of a short month clamp to its last day.
function clampedDate(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

export interface Period {
  start: number; // inclusive, epoch ms
  end: number; // exclusive
}

export function periodContaining(now: Date, startDay: number, offset = 0): Period {
  let start = clampedDate(now.getFullYear(), now.getMonth(), startDay);
  if (start.getTime() > now.getTime()) start = clampedDate(now.getFullYear(), now.getMonth() - 1, startDay);
  start = clampedDate(start.getFullYear(), start.getMonth() + offset, startDay);
  const end = clampedDate(start.getFullYear(), start.getMonth() + 1, startDay);
  return { start: start.getTime(), end: end.getTime() };
}

export function inPeriod(at: number, period: Period): boolean {
  return at >= period.start && at < period.end;
}
