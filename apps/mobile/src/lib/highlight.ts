export interface Segment {
  text: string;
  match: boolean;
}

// Splits `text` into plain and matched segments for every occurrence of each needle.
// Overlaps go to the earlier match, then the longer one. Used to show which parts of an SMS became which field.
export function highlight(text: string, needles: (string | undefined)[]): Segment[] {
  const ranges: [number, number][] = [];
  for (const needle of new Set(needles.filter((n): n is string => !!n && n.length > 0))) {
    for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + needle.length)) ranges.push([i, i + needle.length]);
  }
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
