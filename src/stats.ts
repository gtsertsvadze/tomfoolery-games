// Pure percentage helpers for fruit stats. Rounded to 1 decimal so values fit in UI.
export function sharePct(count: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function rarerThanPct(count: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.round(((total - count) / total) * 1000) / 10;
}
