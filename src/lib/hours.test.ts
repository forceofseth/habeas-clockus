import { describe, expect, it } from 'vitest';

import {
  breakMinutes,
  dayWorkedHours,
  dayWorkedMinutes,
  entryHasHours,
  formatTimeTyping,
  normalizeTime,
  parseTime,
  rangeHasWarning,
  rangeMinutes,
} from './hours';
import type { DayEntry } from '../model/types';

describe('parseTime', () => {
  it('accepts HH:MM and H:MM', () => {
    expect(parseTime('08:00')).toBe(480);
    expect(parseTime('8:00')).toBe(480);
    expect(parseTime('23:59')).toBe(1439);
  });
  it('rejects empty / invalid / out-of-range', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('abc')).toBeNull();
  });
});

describe('normalizeTime / formatTimeTyping', () => {
  it('normalizeTime zero-pads valid, leaves invalid', () => {
    expect(normalizeTime('8:00')).toBe('08:00');
    expect(normalizeTime('08:05')).toBe('08:05');
    expect(normalizeTime('80')).toBe('80');
  });
  it('formatTimeTyping inserts the colon after two digits', () => {
    expect(formatTimeTyping('08')).toBe('08');
    expect(formatTimeTyping('080')).toBe('08:0');
    expect(formatTimeTyping('0800')).toBe('08:00');
    expect(formatTimeTyping('08:00')).toBe('08:00');
    expect(formatTimeTyping('080000')).toBe('08:00'); // capped
  });
});

describe('range / day minutes', () => {
  it('rangeMinutes: empty or non-positive => 0', () => {
    expect(rangeMinutes({ start: '08:00', end: '12:00' })).toBe(240);
    expect(rangeMinutes({ start: '', end: '12:00' })).toBe(0);
    expect(rangeMinutes({ start: '12:00', end: '08:00' })).toBe(0);
  });
  it('rangeHasWarning when end <= start', () => {
    expect(rangeHasWarning({ start: '12:00', end: '08:00' })).toBe(true);
    expect(rangeHasWarning({ start: '08:00', end: '12:00' })).toBe(false);
    expect(rangeHasWarning({ start: '08:00', end: '' })).toBe(false);
  });

  const day = (ranges: DayEntry['ranges'], breaks: string[] = []): DayEntry => ({
    ranges,
    breaks,
    type: 'work',
  });

  it('dayWorkedMinutes sums ranges minus breaks, clamped at 0', () => {
    expect(dayWorkedHours(day([{ start: '08:00', end: '17:00' }], ['01:00']))).toBe(8);
    expect(dayWorkedHours(day([{ start: '08:00', end: '17:00' }], ['00:30', '00:15']))).toBe(8.25);
    expect(dayWorkedHours(day([{ start: '08:00', end: '08:30' }], ['02:00']))).toBe(0);
    expect(dayWorkedMinutes(undefined)).toBe(0);
  });
  it('breakMinutes / entryHasHours', () => {
    expect(breakMinutes(day([], ['00:30', '01:00']))).toBe(90);
    expect(entryHasHours(day([{ start: '08:00', end: '09:00' }]))).toBe(true);
    expect(entryHasHours(day([{ start: '', end: '' }]))).toBe(false);
  });
});
