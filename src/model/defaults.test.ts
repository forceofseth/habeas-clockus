import { describe, expect, it } from 'vitest';

import { DEFAULT_HOLIDAY_RULES, TARGET_PER_WORKDAY, defaultDoc } from './defaults';

describe('defaults', () => {
  it('TARGET_PER_WORKDAY = 42 / 5', () => {
    expect(TARGET_PER_WORKDAY).toBeCloseTo(8.4, 10);
  });

  it('the 10 Bülach/ZH holidays are enabled by default; others present but off', () => {
    const enabled = DEFAULT_HOLIDAY_RULES.filter((r) => r.enabled).map((r) => r.id);
    expect(enabled).toHaveLength(10);
    expect(enabled).toContain('berchtoldstag');
    expect(DEFAULT_HOLIDAY_RULES.find((r) => r.id === 'fronleichnam')?.enabled).toBe(false);
    // unique ids
    expect(new Set(DEFAULT_HOLIDAY_RULES.map((r) => r.id)).size).toBe(DEFAULT_HOLIDAY_RULES.length);
  });

  it('defaultDoc has the expected shape', () => {
    const d = defaultDoc();
    expect(d.schemaVersion).toBe(1);
    expect(d.settings.weeklyHours).toBe(42);
    expect(d.settings.openingVacationDays).toBe(25);
    expect(d.days).toEqual({});
    expect(d.holidayCache).toEqual({});
    expect(d.meta.holidaySource).toBeNull();
  });
});
