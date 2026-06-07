import { describe, expect, it } from 'vitest';

import { isWorkingDay, targetHoursFor } from './workday';
import type { DayEntry, Settings } from '../model/types';

const settings: Settings = {
  weeklyHours: 42,
  workDaysPerWeek: 5,
  targetPerWorkday: 8.4,
  vacationDaysPerYear: 25,
  startDate: null,
  openingBalanceHours: 0,
  openingVacationDays: 25,
};
const noHol = () => false;
const entry = (type: DayEntry['type']): DayEntry => ({ ranges: [], breaks: [], type });

describe('isWorkingDay', () => {
  it('Mon–Fri non-holiday = working; weekend/holiday = not', () => {
    expect(isWorkingDay('2026-06-08', noHol)).toBe(true); // Mon
    expect(isWorkingDay('2026-06-06', noHol)).toBe(false); // Sat
    expect(isWorkingDay('2026-06-08', (k) => k === '2026-06-08')).toBe(false); // holiday
  });
});

describe('targetHoursFor', () => {
  it('weekend / holiday / absence collapse to 0; work + compensation keep the target', () => {
    expect(targetHoursFor('2026-06-08', undefined, settings, noHol)).toBe(8.4); // working day
    expect(targetHoursFor('2026-06-06', undefined, settings, noHol)).toBe(0); // weekend
    expect(targetHoursFor('2026-06-08', undefined, settings, (k) => k === '2026-06-08')).toBe(0); // holiday
    expect(targetHoursFor('2026-06-08', entry('absence'), settings, noHol)).toBe(0); // absence
    expect(targetHoursFor('2026-06-08', entry('compensation'), settings, noHol)).toBe(8.4); // comp keeps target
  });

  it('a half-day absence keeps half the target', () => {
    const halfFerien: DayEntry = { ranges: [], breaks: [], type: 'absence', absenceFraction: 0.5 };
    expect(targetHoursFor('2026-06-08', halfFerien, settings, noHol)).toBeCloseTo(4.2, 5);
    expect(targetHoursFor('2026-06-06', halfFerien, settings, noHol)).toBe(0); // weekend still 0
  });
});
