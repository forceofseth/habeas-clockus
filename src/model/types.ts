// ── Core scalar types ───────────────────────────────────────────────────────

/** A clock time as "HH:MM" (24h), or "" when empty/unset. */
export type TimeStr = string;

/** A local calendar date as "YYYY-MM-DD" (no time, no timezone). */
export type DateKey = string;

/**
 * 'work'         = normal day.
 * 'absence'      = vacation/sick → target 0, never owes hours (neutral).
 * 'compensation' = time-in-lieu → keeps the normal target, so it draws the
 *                  day's hours from the overtime saldo (like an empty past day).
 */
export type DayType = 'work' | 'absence' | 'compensation';

/** The user-facing day status used by the day selector and the wizard. */
export type DayKind = 'work' | 'ferien' | 'krank' | 'kompensation';

// ── Time entries ──────────────────────────────────────────────────────────────

export interface TimeRange {
  start: TimeStr; // "" allowed
  end: TimeStr; // "" allowed
}

export interface DayEntry {
  /** One or many worked time spans (From–To). */
  ranges: TimeRange[];
  /** Zero or many break/pause durations as "HH:MM" (subtracted from worked time). */
  breaks: string[];
  type: DayType;
  note?: string;
  /**
   * Portion of the day taken as the absence: 1 (or absent) = whole day, 0.5 = half day.
   * Only meaningful for `type === 'absence'`. A half day owes the remaining half of the
   * target and counts that fraction against the vacation allowance (Ferien).
   */
  absenceFraction?: number;
}

/** Sparse map — only days the user has actually touched exist. */
export type DayMap = Record<DateKey, DayEntry>;

// ── Holidays ────────────────────────────────────────────────────────────────

/**
 * A user-editable holiday definition. Edited on the Holidays page and persisted
 * in the file. `enabled` rules define the non-working days.
 *   - kind 'fixed'  → recurs every year on `month`/`day` (1-based month).
 *   - kind 'easter' → `offset` days from Easter Sunday (e.g. Good Friday = -2).
 */
export interface HolidayRule {
  id: string;
  name: string;
  kind: 'fixed' | 'easter';
  month?: number;
  day?: number;
  offset?: number;
  enabled: boolean;
}

/** A rule resolved to a concrete date for a given year. */
export interface Holiday {
  date: DateKey;
  name: string;
}

// ── Settings & document ───────────────────────────────────────────────────────

export interface Settings {
  weeklyHours: number; // 42
  workDaysPerWeek: number; // 5
  targetPerWorkday: number; // 8.4
  /** Annual vacation entitlement in days. */
  vacationDaysPerYear: number; // 25
  /** First day counted toward the cumulative balance (e.g. employment start). */
  startDate: DateKey | null;
  /** Carried-over flex-time balance (+/− hours) at the start date. */
  openingBalanceHours: number;
  /** Remaining vacation days at the start date (applies to the start year). */
  openingVacationDays: number;
}

export interface DocMeta {
  lastHolidaySync: DateKey | null;
  holidaySource: 'online' | 'computed' | null;
}

export interface TimesheetDoc {
  schemaVersion: 1;
  settings: Settings;
  days: DayMap;
  /** THE config the Holidays page edits — the authority for non-working days. */
  holidayConfig: HolidayRule[];
  /** Enabled rules resolved per year (+ online name enrichment). Persisted. */
  holidayCache: Record<number, Holiday[]>;
  meta: DocMeta;
}
