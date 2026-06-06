import { describe, expect, it } from 'vitest';

import { normalizeDoc } from './storage';
import { dayWorkedHours } from './hours';
import { DEFAULT_HOLIDAY_RULES } from '../model/defaults';

describe('normalizeDoc', () => {
  it('returns a valid default doc for junk input', () => {
    const d = normalizeDoc(null);
    expect(d.schemaVersion).toBe(1);
    expect(d.settings.targetPerWorkday).toBe(8.4);
    expect(d.settings.vacationDaysPerYear).toBe(25);
    expect(d.days).toEqual({});
    expect(d.holidayConfig.length).toBe(DEFAULT_HOLIDAY_RULES.length);
  });

  it('migrates legacy { morning, afternoon } entries into ranges + empty breaks', () => {
    const d = normalizeDoc({
      days: {
        '2026-06-01': {
          morning: { start: '08:00', end: '12:00' },
          afternoon: { start: '13:00', end: '17:00' },
          type: 'work',
        },
      },
    });
    const e = d.days['2026-06-01'];
    expect(Array.isArray(e.ranges)).toBe(true);
    expect(e.ranges).toHaveLength(2);
    expect(e.breaks).toEqual([]);
    expect(dayWorkedHours(e)).toBe(8);
  });

  it('keeps the new ranges/breaks shape and drops malformed day keys', () => {
    const d = normalizeDoc({
      days: {
        '2026-06-02': { ranges: [{ start: '09:00', end: '12:00' }], breaks: ['00:30'], type: 'absence', note: 'Ferien' },
        'not-a-date': { ranges: [], breaks: [], type: 'work' },
      },
    });
    expect(dayWorkedHours(d.days['2026-06-02'])).toBe(2.5);
    expect(d.days['2026-06-02'].note).toBe('Ferien');
    expect(d.days['not-a-date']).toBeUndefined();
  });

  it('merges stored holiday config with new default rules + keeps toggles + customs', () => {
    const stored = DEFAULT_HOLIDAY_RULES.filter((r) => r.enabled).map((r) =>
      r.id === 'berchtoldstag' ? { ...r, enabled: false } : { ...r },
    );
    stored.push({ id: 'mein-tag', name: 'Mein Tag', kind: 'fixed', month: 7, day: 7, enabled: true });
    const d = normalizeDoc({ holidayConfig: stored });
    expect(d.holidayConfig.find((r) => r.id === 'berchtoldstag')?.enabled).toBe(false); // toggle kept
    expect(d.holidayConfig.find((r) => r.id === 'allerheiligen')?.enabled).toBe(false); // new default added
    expect(d.holidayConfig.find((r) => r.id === 'mein-tag')?.name).toBe('Mein Tag'); // custom survives
  });

  it('parses opening balances + start date', () => {
    const d = normalizeDoc({
      settings: { startDate: '2026-06-15', openingBalanceHours: 12.5, openingVacationDays: 10 },
    });
    expect(d.settings.startDate).toBe('2026-06-15');
    expect(d.settings.openingBalanceHours).toBe(12.5);
    expect(d.settings.openingVacationDays).toBe(10);
  });

  it('rejects a malformed start date', () => {
    expect(normalizeDoc({ settings: { startDate: 'nope' } }).settings.startDate).toBeNull();
  });
});
