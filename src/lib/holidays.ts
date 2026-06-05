import type { DateKey, Holiday, HolidayRule } from '../model/types';
import { localDate, toKey } from './date';

/** Easter Sunday for a Gregorian year (Anonymous Gregorian / Computus algorithm). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return localDate(year, month, day);
}

export function resolveRuleDate(rule: HolidayRule, year: number): DateKey | null {
  if (rule.kind === 'fixed' && rule.month && rule.day) {
    return toKey(localDate(year, rule.month, rule.day));
  }
  if (rule.kind === 'easter' && typeof rule.offset === 'number') {
    const e = easterSunday(year);
    e.setDate(e.getDate() + rule.offset);
    return toKey(e);
  }
  return null;
}

/** Resolve the ENABLED rules to concrete holidays for a year, sorted by date. */
export function resolveRules(rules: HolidayRule[], year: number): Holiday[] {
  const out: Holiday[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const date = resolveRuleDate(rule, year);
    if (date) out.push({ date, name: rule.name });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

// Memoize resolved maps by (year + enabled-rule signature) so the cumulative
// balance loop and month views don't recompute Easter repeatedly.
const mapCache = new Map<string, Map<DateKey, Holiday>>();

function signature(rules: HolidayRule[]): string {
  return rules
    .filter((r) => r.enabled)
    .map((r) => `${r.id}:${r.kind}:${r.month ?? ''}:${r.day ?? ''}:${r.offset ?? ''}:${r.name}`)
    .join('|');
}

export function buildHolidayMap(rules: HolidayRule[], year: number): Map<DateKey, Holiday> {
  const key = `${year}::${signature(rules)}`;
  let m = mapCache.get(key);
  if (!m) {
    m = new Map(resolveRules(rules, year).map((h) => [h.date, h] as const));
    mapCache.set(key, m);
  }
  return m;
}

// ── Online enrichment (Nager.Date) ────────────────────────────────────────────

interface NagerHoliday {
  date: string; // "YYYY-MM-DD"
  localName: string;
  name: string;
  global: boolean;
  counties: string[] | null;
}

/**
 * Fetch all Swiss public holidays for a year from the free, key-less,
 * CORS-enabled Nager.Date API. Returns a date→localName map (whole CH, all
 * cantons) for name enrichment, or null on any failure / timeout (caller falls
 * back to computed names).
 */
export async function fetchHolidayNames(
  year: number,
  timeoutMs = 5000,
): Promise<Map<DateKey, string> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/CH`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: NagerHoliday[] = await res.json();
    const map = new Map<DateKey, string>();
    for (const h of data) map.set(h.date, h.localName || h.name);
    return map;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
