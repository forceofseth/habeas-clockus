import type { HolidayRule, Settings, TimesheetDoc } from './types';

export const STORAGE_KEY = 'habeas-clockus:v1';

export const WEEKLY_HOURS = 42;
export const WORK_DAYS_PER_WEEK = 5;
export const TARGET_PER_WORKDAY = WEEKLY_HOURS / WORK_DAYS_PER_WEEK; // 8.4
export const DEFAULT_VACATION_DAYS = 25;

/**
 * Swiss public holidays. The full nationwide + cantonal set is seeded, but only
 * the ones observed in Bülach (Canton Zürich) are enabled by default — the rest
 * are present and can be switched on from the Settings page. (Holidays defined
 * by a weekday rule, e.g. Jeûne genevois / Näfelser Fahrt, are omitted.)
 */
export const DEFAULT_HOLIDAY_RULES: HolidayRule[] = [
  // ── Enabled for Bülach / Zürich ──
  { id: 'neujahr', name: 'Neujahr', kind: 'fixed', month: 1, day: 1, enabled: true },
  { id: 'berchtoldstag', name: 'Berchtoldstag', kind: 'fixed', month: 1, day: 2, enabled: true },
  { id: 'karfreitag', name: 'Karfreitag', kind: 'easter', offset: -2, enabled: true },
  { id: 'ostermontag', name: 'Ostermontag', kind: 'easter', offset: 1, enabled: true },
  { id: 'tag-der-arbeit', name: 'Tag der Arbeit', kind: 'fixed', month: 5, day: 1, enabled: true },
  { id: 'auffahrt', name: 'Auffahrt', kind: 'easter', offset: 39, enabled: true },
  { id: 'pfingstmontag', name: 'Pfingstmontag', kind: 'easter', offset: 50, enabled: true },
  { id: 'bundesfeier', name: 'Bundesfeier', kind: 'fixed', month: 8, day: 1, enabled: true },
  { id: 'weihnachten', name: 'Weihnachten', kind: 'fixed', month: 12, day: 25, enabled: true },
  { id: 'stephanstag', name: 'Stephanstag', kind: 'fixed', month: 12, day: 26, enabled: true },

  // ── Other Swiss cantonal holidays (off by default) ──
  { id: 'heilige-drei-koenige', name: 'Heilige Drei Könige', kind: 'fixed', month: 1, day: 6, enabled: false },
  { id: 'josefstag', name: 'Josefstag', kind: 'fixed', month: 3, day: 19, enabled: false },
  { id: 'fronleichnam', name: 'Fronleichnam', kind: 'easter', offset: 60, enabled: false },
  { id: 'peter-und-paul', name: 'Peter und Paul', kind: 'fixed', month: 6, day: 29, enabled: false },
  { id: 'mariae-himmelfahrt', name: 'Mariä Himmelfahrt', kind: 'fixed', month: 8, day: 15, enabled: false },
  { id: 'allerheiligen', name: 'Allerheiligen', kind: 'fixed', month: 11, day: 1, enabled: false },
  { id: 'mariae-empfaengnis', name: 'Mariä Empfängnis', kind: 'fixed', month: 12, day: 8, enabled: false },
];

export function defaultSettings(): Settings {
  return {
    weeklyHours: WEEKLY_HOURS,
    workDaysPerWeek: WORK_DAYS_PER_WEEK,
    targetPerWorkday: TARGET_PER_WORKDAY,
    vacationDaysPerYear: DEFAULT_VACATION_DAYS,
    startDate: null,
    openingBalanceHours: 0,
    openingVacationDays: DEFAULT_VACATION_DAYS,
  };
}

export function defaultDoc(): TimesheetDoc {
  return {
    schemaVersion: 1,
    settings: defaultSettings(),
    days: {},
    holidayConfig: DEFAULT_HOLIDAY_RULES.map((r) => ({ ...r })),
    holidayCache: {},
    meta: { lastHolidaySync: null, holidaySource: null },
  };
}
