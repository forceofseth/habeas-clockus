import type { DateKey } from '../model/types';

// All keys are LOCAL calendar dates. We never use toISOString() (that is UTC and
// would shift the day across timezones). Dates are built at local noon so DST
// transitions can never bump them to the previous/next calendar day.

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Build a local Date at noon from y/m/d (month is 1-based). */
export function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromKey(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return localDate(y, m, d);
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function yearOf(k: DateKey): number {
  return Number(k.slice(0, 4));
}

/** 0 = Monday … 6 = Sunday (locale-independent, Monday-first). */
export function weekdayMon0(k: DateKey): number {
  return (fromKey(k).getDay() + 6) % 7;
}

export function isWeekend(k: DateKey): boolean {
  return weekdayMon0(k) >= 5;
}

export function addDays(k: DateKey, n: number): DateKey {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function addMonths(k: DateKey, n: number): DateKey {
  const d = fromKey(k);
  d.setMonth(d.getMonth() + n);
  return toKey(d);
}

export function startOfWeekMonday(k: DateKey): DateKey {
  return addDays(k, -weekdayMon0(k));
}

/** 7 keys, Monday … Sunday, for the week containing `k`. */
export function weekRange(k: DateKey): DateKey[] {
  const start = startOfWeekMonday(k);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** All day-keys of the month containing `k`, 1st … last. */
export function monthRange(k: DateKey): DateKey[] {
  const d = fromKey(k);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const last = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: last }, (_, i) => toKey(localDate(year, month + 1, i + 1)));
}

export function compareKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ── Formatting (de-CH) ────────────────────────────────────────────────────────

const dayFmt = new Intl.DateTimeFormat('de-CH', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

const monthTitleFmt = new Intl.DateTimeFormat('de-CH', {
  month: 'long',
  year: 'numeric',
});

/** e.g. "Mo, 02.06." */
export function formatDayLabel(k: DateKey): string {
  return dayFmt.format(fromKey(k));
}

/** e.g. "Juni 2026" */
export function formatMonthTitle(k: DateKey): string {
  return monthTitleFmt.format(fromKey(k));
}

/** e.g. "Woche vom 01.06.2026" */
export function formatWeekTitle(k: DateKey): string {
  const start = fromKey(startOfWeekMonday(k));
  const s = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(start);
  return `Woche vom ${s}`;
}

/** Signed hours, e.g. "+2.50 h" / "−1.25 h" / "0.00 h". */
export function formatSigned(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded).toFixed(2)} h`;
}

/** Unsigned hours, e.g. "8.40 h". */
export function formatHours(hours: number): string {
  return `${(Math.round(hours * 100) / 100).toFixed(2)} h`;
}
