import type { DateKey, DayEntry, Settings } from '../model/types';
import { isWeekend } from './date';

export type HolidayLookup = (k: DateKey) => boolean;

/** A working day = Mon–Fri AND not an enabled holiday. */
export function isWorkingDay(k: DateKey, isHoliday: HolidayLookup): boolean {
  return !isWeekend(k) && !isHoliday(k);
}

/**
 * Target hours for a day. Collapses to 0 for weekends, holidays and absence
 * days; otherwise the standard per-workday target (8.4h). Single source of
 * truth for "does this day owe hours".
 */
export function targetHoursFor(
  k: DateKey,
  entry: DayEntry | undefined,
  settings: Settings,
  isHoliday: HolidayLookup,
): number {
  if (entry?.type === 'absence') return 0;
  if (!isWorkingDay(k, isHoliday)) return 0;
  return settings.targetPerWorkday;
}
