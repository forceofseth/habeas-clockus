import { describe, expect, it } from 'vitest';

import { toKey } from './date';
import { buildHolidayMap, easterSunday, resolveRuleDate, resolveRules } from './holidays';
import { DEFAULT_HOLIDAY_RULES } from '../model/defaults';

const byName = (year: number) =>
  Object.fromEntries(resolveRules(DEFAULT_HOLIDAY_RULES, year).map((h) => [h.name, h.date]));

describe('easterSunday (Computus)', () => {
  it('matches known dates', () => {
    expect(toKey(easterSunday(2025))).toBe('2025-04-20');
    expect(toKey(easterSunday(2026))).toBe('2026-04-05');
    expect(toKey(easterSunday(2027))).toBe('2027-03-28');
    expect(toKey(easterSunday(2030))).toBe('2030-04-21');
  });
});

describe('resolveRules — Bülach / Canton Zürich defaults', () => {
  it('resolves the 10 enabled holidays for 2026 with correct dates', () => {
    const h = byName(2026);
    expect(resolveRules(DEFAULT_HOLIDAY_RULES, 2026)).toHaveLength(10);
    expect(h['Neujahr']).toBe('2026-01-01');
    expect(h['Berchtoldstag']).toBe('2026-01-02');
    expect(h['Karfreitag']).toBe('2026-04-03');
    expect(h['Ostermontag']).toBe('2026-04-06');
    expect(h['Tag der Arbeit']).toBe('2026-05-01');
    expect(h['Auffahrt']).toBe('2026-05-14');
    expect(h['Pfingstmontag']).toBe('2026-05-25');
    expect(h['Bundesfeier']).toBe('2026-08-01');
    expect(h['Weihnachten']).toBe('2026-12-25');
    expect(h['Stephanstag']).toBe('2026-12-26');
  });

  it('movable feasts shift correctly per year', () => {
    expect(byName(2025)['Auffahrt']).toBe('2025-05-29');
    expect(byName(2025)['Pfingstmontag']).toBe('2025-06-09');
    expect(byName(2027)['Auffahrt']).toBe('2027-05-06');
    expect(byName(2027)['Karfreitag']).toBe('2027-03-26');
  });

  it('disabled holidays only appear when enabled', () => {
    expect(byName(2026)['Fronleichnam']).toBeUndefined();
    const withFron = DEFAULT_HOLIDAY_RULES.map((r) =>
      r.id === 'fronleichnam' ? { ...r, enabled: true } : r,
    );
    const fron = resolveRules(withFron, 2026).find((h) => h.name === 'Fronleichnam');
    expect(fron?.date).toBe('2026-06-04'); // Easter +60
  });
});

describe('resolveRuleDate / buildHolidayMap', () => {
  it('resolveRuleDate handles fixed + easter rules', () => {
    expect(resolveRuleDate({ id: 'x', name: 'X', kind: 'fixed', month: 8, day: 1, enabled: true }, 2026)).toBe(
      '2026-08-01',
    );
    expect(resolveRuleDate({ id: 'y', name: 'Y', kind: 'easter', offset: 1, enabled: true }, 2026)).toBe(
      '2026-04-06',
    );
  });
  it('buildHolidayMap is keyed by date and only includes enabled rules', () => {
    const m = buildHolidayMap(DEFAULT_HOLIDAY_RULES, 2026);
    expect(m.get('2026-05-14')?.name).toBe('Auffahrt');
    expect(m.has('2026-06-04')).toBe(false); // Fronleichnam disabled
  });
});
