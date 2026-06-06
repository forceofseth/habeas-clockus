import { describe, expect, it } from 'vitest';

import { cumulativeBalance, dayBalance, periodTotals, vacationInfo, vacationTaken } from './balance';
import { weekRange } from './date';
import type { DayEntry, DayMap, Settings } from '../model/types';

const base: Settings = {
  weeklyHours: 42,
  workDaysPerWeek: 5,
  targetPerWorkday: 8.4,
  vacationDaysPerYear: 25,
  startDate: null,
  openingBalanceHours: 0,
  openingVacationDays: 25,
};
const noHol = () => false;
const r10 = Math.round; // helper alias
const round1 = (n: number) => r10(n * 10) / 10;

const full = (): DayEntry => ({
  ranges: [{ start: '08:00', end: '17:24' }], // 9.4h - lunch... actually 9h24
  breaks: ['01:00'],
  type: 'work',
}); // 9h24 - 1h = 8.4h
const empty = (type: DayEntry['type'] = 'work', note?: string): DayEntry => ({
  ranges: [{ start: '', end: '' }],
  breaks: [],
  type,
  ...(note ? { note } : {}),
});

const today = '2026-06-29'; // Monday

describe('dayBalance', () => {
  it('a filled day counts immediately (worked − target)', () => {
    expect(round1(dayBalance('2026-06-15', full(), base, noHol, today).balance)).toBe(0);
  });
  it('blank working day: −target only once it is past', () => {
    expect(round1(dayBalance('2026-06-15', undefined, base, noHol, today).balance)).toBe(-8.4); // past Mon
    expect(dayBalance(today, undefined, base, noHol, today).balance).toBe(0); // today
    expect(dayBalance('2026-07-06', undefined, base, noHol, today).balance).toBe(0); // future
    expect(dayBalance(today, undefined, base, noHol, today).counted).toBe(false);
  });
  it('absence (Ferien/Krank) is neutral', () => {
    const b = dayBalance('2026-06-15', empty('absence', 'Ferien'), base, noHol, today);
    expect(b.balance).toBe(0);
    expect(b.counted).toBe(true);
  });
  it('compensation draws from overtime like a blank past day', () => {
    expect(round1(dayBalance('2026-06-15', empty('compensation'), base, noHol, today).balance)).toBe(-8.4);
    expect(dayBalance('2026-07-06', empty('compensation'), base, noHol, today).balance).toBe(0); // future
  });
  it('weekend hours are pure overtime', () => {
    const sat: DayEntry = { ranges: [{ start: '09:00', end: '11:00' }], breaks: [], type: 'work' };
    expect(round1(dayBalance('2026-06-13', sat, base, noHol, today).balance)).toBe(2); // Sat
  });
  it('days before the start date are not counted', () => {
    const s = { ...base, startDate: '2026-06-15' };
    const b = dayBalance('2026-06-08', undefined, s, noHol, today);
    expect(b.counted).toBe(false);
    expect(b.balance).toBe(0);
  });
});

describe('periodTotals', () => {
  it('a full past Mon–Fri week = 42 / 42 / 0', () => {
    const wk = weekRange('2026-06-15'); // Mon 15 .. Sun 21, fully past vs today 29
    const days: DayMap = {};
    for (let i = 0; i < 5; i++) days[wk[i]] = full();
    const t = periodTotals(wk, days, base, noHol, today);
    expect(round1(t.worked)).toBe(42);
    expect(round1(t.target)).toBe(42);
    expect(round1(t.balance)).toBe(0);
  });
});

describe('cumulativeBalance', () => {
  it('sums blank past workdays from the start date', () => {
    const s = { ...base, startDate: '2026-06-15' };
    // 15..28 blank: workdays 15-19 (5) + 22-26 (5) = 10 => -84
    expect(round1(cumulativeBalance({}, s, noHol, today))).toBe(-84);
  });
  it('adds the opening balance only when a start date is set', () => {
    const s = { ...base, startDate: '2026-06-22', openingBalanceHours: 12 };
    // 22..28 blank workdays 22-26 (5) = -42, + opening 12 => -30
    expect(round1(cumulativeBalance({}, s, noHol, today))).toBe(-30);
    expect(cumulativeBalance({}, { ...base, openingBalanceHours: 12 }, noHol, today)).toBe(0); // no startDate
  });
});

describe('vacation', () => {
  const ferien = (): DayEntry => ({ ranges: [], breaks: [], type: 'absence', note: 'Ferien' });
  const krank = (): DayEntry => ({ ranges: [], breaks: [], type: 'absence', note: 'Krank' });

  it('vacationTaken counts only Ferien in the year', () => {
    const days: DayMap = { '2026-03-02': ferien(), '2026-07-01': krank(), '2027-01-05': ferien() };
    expect(vacationTaken(days, 2026)).toBe(1);
    expect(vacationTaken(days, 2027)).toBe(1);
  });

  it('vacationInfo: start year uses opening remaining; later years full; before = n/a', () => {
    const s = { ...base, startDate: '2026-06-15', openingVacationDays: 10, vacationDaysPerYear: 25 };
    const days: DayMap = {
      '2026-03-02': ferien(), // before start -> ignored
      '2026-07-01': ferien(), // after start -> counts
      '2027-01-05': ferien(),
    };
    const v26 = vacationInfo(days, s, 2026);
    expect(v26).toMatchObject({ applicable: true, entitlement: 10, taken: 1, remaining: 9 });
    const v27 = vacationInfo(days, s, 2027);
    expect(v27).toMatchObject({ applicable: true, entitlement: 25, remaining: 24 });
    expect(vacationInfo(days, s, 2025).applicable).toBe(false);
  });
});
