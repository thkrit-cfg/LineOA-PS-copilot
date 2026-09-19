/** Small shared formatting helpers for the admin portal. */

/** Local 'YYYY-MM-DD' for a day offset from today (matches server day keys). */
export function localDayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** 'a, b ,c' -> ['a', 'b', 'c'] (trims, drops empties). */
export function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/** ISO string -> '19 Sep, 14:05' (en-GB). '' when null/empty. */
export function fmtDateTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 'YYYY-MM-DD' -> '19 Sep'. */
export function fmtDay(day: string): string {
  if (!day) return '';
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
