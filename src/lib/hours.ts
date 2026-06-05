import type { DayEntry, TimeRange, TimeStr } from '../model/types';

const TIME_RE = /^(\d{1,2}):([0-5]\d)$/;

/** "H:MM" / "HH:MM" → minutes since midnight, or null if empty/invalid. */
export function parseTime(t: TimeStr): number | null {
  const m = TIME_RE.exec(t.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  if (hours > 23) return null;
  return hours * 60 + Number(m[2]);
}

/**
 * Live formatting while typing: keep only digits and insert the colon after the
 * first two. e.g. "0800" → "08:00", "08" → "08", "080" → "08:0".
 */
export function formatTimeTyping(raw: string): TimeStr {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** Tidy a typed value to zero-padded "HH:MM" when valid; otherwise leave as-is. */
export function normalizeTime(t: TimeStr): TimeStr {
  const min = parseTime(t);
  if (min === null) return t;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Minutes worked in a range. Empty/invalid side → 0. end <= start → 0. */
export function rangeMinutes(r: TimeRange): number {
  const start = parseTime(r.start);
  const end = parseTime(r.end);
  if (start === null || end === null) return 0;
  const diff = end - start;
  return diff > 0 ? diff : 0;
}

/** True when both sides are set but the range is non-positive (UI warning). */
export function rangeHasWarning(r: TimeRange): boolean {
  const start = parseTime(r.start);
  const end = parseTime(r.end);
  return start !== null && end !== null && end <= start;
}

/** Total break/pause minutes for the day. */
export function breakMinutes(entry: DayEntry | undefined): number {
  if (!entry?.breaks) return 0;
  return entry.breaks.reduce((sum, b) => sum + (parseTime(b) ?? 0), 0);
}

/** Net worked minutes = sum of ranges − sum of breaks (never below 0). */
export function dayWorkedMinutes(entry: DayEntry | undefined): number {
  if (!entry) return 0;
  const worked = entry.ranges.reduce((sum, r) => sum + rangeMinutes(r), 0);
  return Math.max(0, worked - breakMinutes(entry));
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function dayWorkedHours(entry: DayEntry | undefined): number {
  return minutesToHours(dayWorkedMinutes(entry));
}

/** Does this entry contain any usable time at all? */
export function entryHasHours(entry: DayEntry | undefined): boolean {
  return dayWorkedMinutes(entry) > 0;
}
