import type { DateKey, DayEntry, Settings } from '../model/types';
import { isWeekend } from './date';

export type HolidayLookup = (k: DateKey) => boolean;

/** A working day = Mon–Fri AND not an enabled holiday. */
export function isWorkingDay(k: DateKey, isHoliday: HolidayLookup): boolean {
  return !isWeekend(k) && !isHoliday(k);
}

/**
 * Portion of a day taken as absence: 1 = whole day (default), 0.5 = half day.
 * Clamped to (0, 1]; a missing/invalid value means a whole day.
 */
export function absenceFractionOf(entry: DayEntry | undefined): number {
  const f = entry?.absenceFraction;
  if (typeof f !== 'number' || !Number.isFinite(f) || f >= 1) return 1;
  return f <= 0 ? 1 : f;
}

/**
 * Target hours for a day. Collapses to 0 for weekends and holidays; a whole-day
 * absence is also 0, while a half-day absence keeps the un-absent portion of the
 * target (e.g. 4.2h for a ½ day). Otherwise the standard per-workday target
 * (8.4h). Single source of truth for "does this day owe hours".
 */
export function targetHoursFor(
  k: DateKey,
  entry: DayEntry | undefined,
  settings: Settings,
  isHoliday: HolidayLookup,
): number {
  if (!isWorkingDay(k, isHoliday)) return 0;
  if (entry?.type === 'absence') {
    return settings.targetPerWorkday * (1 - absenceFractionOf(entry));
  }
  return settings.targetPerWorkday;
}
