import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  fromKey,
  formatHours,
  formatSigned,
  isWeekend,
  localDate,
  monthRange,
  startOfWeekMonday,
  toKey,
  weekRange,
  weekdayMon0,
  yearOf,
} from './date';

describe('date keys', () => {
  it('round-trips local dates without UTC drift', () => {
    expect(toKey(fromKey('2026-03-29'))).toBe('2026-03-29');
    expect(toKey(localDate(2026, 1, 1))).toBe('2026-01-01');
  });

  it('yearOf reads the year', () => {
    expect(yearOf('2027-12-31')).toBe(2027);
  });

  it('weekdayMon0 is Monday-first', () => {
    expect(weekdayMon0('2026-06-01')).toBe(0); // Monday
    expect(weekdayMon0('2026-06-07')).toBe(6); // Sunday
  });

  it('isWeekend', () => {
    expect(isWeekend('2026-06-06')).toBe(true); // Sat
    expect(isWeekend('2026-06-07')).toBe(true); // Sun
    expect(isWeekend('2026-06-08')).toBe(false); // Mon
  });
});

describe('date arithmetic (DST + boundaries)', () => {
  it('addDays across the spring DST change (2026-03-29)', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
  });
  it('addDays across the autumn DST change (2026-10-25)', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });
  it('addDays across the year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('addMonths', () => {
    expect(addMonths('2026-06-15', 1)).toBe('2026-07-15');
    expect(addMonths('2026-01-31', 1)).toBe('2026-03-03'); // JS month overflow
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });
});

describe('ranges', () => {
  it('startOfWeekMonday', () => {
    expect(startOfWeekMonday('2026-06-03')).toBe('2026-06-01'); // Wed -> Mon
  });
  it('weekRange is 7 consecutive days Mon..Sun', () => {
    const wk = weekRange('2026-03-29'); // contains DST change
    expect(wk).toHaveLength(7);
    expect(wk[0]).toBe('2026-03-23');
    expect(wk[6]).toBe('2026-03-29');
  });
  it('monthRange covers the whole month', () => {
    const m = monthRange('2026-02-15'); // 2026 not a leap year
    expect(m).toHaveLength(28);
    expect(m[0]).toBe('2026-02-01');
    expect(m[27]).toBe('2026-02-28');
  });
});

describe('formatting', () => {
  it('formatHours rounds to 2 decimals', () => {
    expect(formatHours(8.4)).toBe('8.40 h');
    expect(formatHours(8.456)).toBe('8.46 h');
  });
  it('formatSigned shows sign', () => {
    expect(formatSigned(2.5)).toBe('+2.50 h');
    expect(formatSigned(-1.25)).toBe('−1.25 h');
    expect(formatSigned(0)).toBe('0.00 h');
  });
});
