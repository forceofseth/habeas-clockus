import type { DateKey, DayEntry, DayMap, Settings } from '../model/types';
import { addDays, yearOf } from './date';
import { dayWorkedHours } from './hours';
import { absenceFractionOf, isWorkingDay, targetHoursFor, type HolidayLookup } from './workday';

export interface DayBalance {
  date: DateKey;
  worked: number; // hours worked
  target: number; // nominal target for the day (0 on weekend/holiday/absence)
  balance: number; // contribution to the running balance (0 for today & future)
  counted: boolean; // did it contribute to the balance?
}

/**
 * The Gleitzeit seam.
 *   - A day with logged time (or marked absence) is accounted IMMEDIATELY,
 *     balance = worked − target, regardless of today/future. So as soon as you
 *     enter a time, the day shows up in the balance.
 *   - A still-empty working day only counts negatively once it is OVER
 *     (date < today): balance = −target (−8.4). Today/future empty days are 0.
 *   - Empty weekend/holiday days are always 0 (no target, no hours).
 */
export function dayBalance(
  k: DateKey,
  entry: DayEntry | undefined,
  settings: Settings,
  isHoliday: HolidayLookup,
  today: DateKey,
): DayBalance {
  const worked = dayWorkedHours(entry);

  // Days before the employment start date are not part of the balance at all.
  if (settings.startDate && k < settings.startDate) {
    return { date: k, worked, target: 0, balance: 0, counted: false };
  }

  const target = targetHoursFor(k, entry, settings, isHoliday);
  const isAbsence = entry?.type === 'absence';
  const hasHours = worked > 0;

  let balance = 0;
  let counted = false;

  if (isAbsence || hasHours) {
    counted = true;
    balance = worked - target; // target is 0 on weekend/holiday/absence
  } else if (k < today && isWorkingDay(k, isHoliday)) {
    counted = true;
    balance = -target;
  }

  return { date: k, worked, target, balance, counted };
}

export interface PeriodTotals {
  worked: number;
  target: number; // nominal target across the period (all working days)
  balance: number; // only elapsed (past) days contribute
}

export function periodTotals(
  range: DateKey[],
  days: DayMap,
  settings: Settings,
  isHoliday: HolidayLookup,
  today: DateKey,
): PeriodTotals {
  let worked = 0;
  let target = 0;
  let balance = 0;
  for (const k of range) {
    if (settings.startDate && k < settings.startDate) continue; // not calculated
    const entry = days[k];
    worked += dayWorkedHours(entry);
    target += targetHoursFor(k, entry, settings, isHoliday);
    balance += dayBalance(k, entry, settings, isHoliday, today).balance;
  }
  return { worked, target, balance };
}

/** Vacation (Ferien) days taken in a given calendar year; half-days count 0.5. */
export function vacationTaken(days: DayMap, year: number): number {
  let n = 0;
  for (const k of Object.keys(days)) {
    const e = days[k];
    if (yearOf(k) === year && e.type === 'absence' && e.note === 'Ferien') n += absenceFractionOf(e);
  }
  return n;
}

/**
 * Ferien taken within one calendar year, summing half-day fractions and applying
 * the start-year filter (only Ferien on/after the start date count in that year).
 */
function vacationTakenInYear(days: DayMap, settings: Settings, year: number): number {
  const startYear = settings.startDate ? yearOf(settings.startDate) : null;
  let taken = 0;
  for (const k of Object.keys(days)) {
    const e = days[k];
    if (e.type !== 'absence' || e.note !== 'Ferien' || yearOf(k) !== year) continue;
    if (startYear !== null && year === startYear && settings.startDate && k < settings.startDate) {
      continue;
    }
    taken += absenceFractionOf(e);
  }
  return taken;
}

export interface VacationInfo {
  /** False for years entirely before the start date — nothing to calculate. */
  applicable: boolean;
  /** Days available this year, including any carried-over balance. */
  entitlement: number;
  taken: number;
  remaining: number;
  /** Days rolled in from the prior year (0 in the start year and when no start date is set). */
  carriedOver: number;
}

/**
 * Vacation balance for a calendar year. Unused days roll over in full (no cap):
 * each year's available days = the annual entitlement + the previous year's
 * remaining (which may be negative). The start year is seeded by
 * `openingVacationDays` (remaining at the start date); without a start date there
 * is no anchor to chain from, so it falls back to a plain per-year entitlement.
 */
export function vacationInfo(days: DayMap, settings: Settings, year: number): VacationInfo {
  const startYear = settings.startDate ? yearOf(settings.startDate) : null;
  if (startYear !== null && year < startYear) {
    return { applicable: false, entitlement: 0, taken: 0, remaining: 0, carriedOver: 0 };
  }

  // No start anchor → per-year, no carry-over.
  if (startYear === null) {
    const taken = vacationTakenInYear(days, settings, year);
    const entitlement = settings.vacationDaysPerYear;
    return { applicable: true, entitlement, taken, remaining: entitlement - taken, carriedOver: 0 };
  }

  // Chain the remaining balance from the start year up to the requested year.
  let carryIn = 0;
  let entitlement = 0;
  let taken = 0;
  let remaining = 0;
  let carriedOver = 0;
  for (let y = startYear; y <= year; y++) {
    const base = y === startYear ? settings.openingVacationDays : settings.vacationDaysPerYear;
    carriedOver = carryIn;
    entitlement = base + carryIn;
    taken = vacationTakenInYear(days, settings, y);
    remaining = entitlement - taken;
    carryIn = remaining; // uncapped; may be negative
  }
  return { applicable: true, entitlement, taken, remaining, carriedOver };
}

function earliestKey(days: DayMap): DateKey | null {
  let min: DateKey | null = null;
  for (const k of Object.keys(days)) {
    if (min === null || k < min) min = k;
  }
  return min;
}

/**
 * All-time balance: sum of every day's contribution from the configured start
 * date (or the earliest recorded day) through today, plus any days already
 * logged ahead of today (a day counts as soon as it has a time entry).
 */
export function cumulativeBalance(
  days: DayMap,
  settings: Settings,
  isHoliday: HolidayLookup,
  today: DateKey,
): number {
  const start = settings.startDate ?? earliestKey(days);
  if (!start) return 0;

  // Carried-over opening balance applies once a start date is anchored.
  let total = settings.startDate ? settings.openingBalanceHours : 0;
  let cur = start;
  // Hard guard against a pathological range; ~30 years of days.
  let guard = 0;
  while (cur <= today && guard < 20000) {
    total += dayBalance(cur, days[cur], settings, isHoliday, today).balance;
    cur = addDays(cur, 1);
    guard++;
  }
  // Days logged ahead of today are accounted too.
  for (const k of Object.keys(days)) {
    if (k > today) total += dayBalance(k, days[k], settings, isHoliday, today).balance;
  }
  return total;
}
