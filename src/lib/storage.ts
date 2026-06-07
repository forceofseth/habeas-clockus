import { DEFAULT_HOLIDAY_RULES, STORAGE_KEY, defaultDoc, defaultSettings } from '../model/defaults';
import type {
  DayEntry,
  DayMap,
  Holiday,
  HolidayRule,
  Settings,
  TimesheetDoc,
  TimeRange,
} from '../model/types';
import { todayKey } from './date';

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function normRange(v: unknown): TimeRange {
  const o = (v ?? {}) as Record<string, unknown>;
  return { start: asString(o.start), end: asString(o.end) };
}

function normEntry(v: unknown): DayEntry | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const type: DayEntry['type'] =
    o.type === 'absence' ? 'absence' : o.type === 'compensation' ? 'compensation' : 'work';

  let ranges: TimeRange[];
  if (Array.isArray(o.ranges)) {
    ranges = o.ranges.map(normRange);
  } else {
    // Migrate legacy { morning, afternoon } shape into a ranges list.
    ranges = [normRange(o.morning), normRange(o.afternoon)];
  }
  if (ranges.length === 0) ranges = [{ start: '', end: '' }];

  const breaks = Array.isArray(o.breaks)
    ? o.breaks.filter((b): b is string => typeof b === 'string')
    : [];

  const entry: DayEntry = { ranges, breaks, type };
  if (typeof o.note === 'string' && o.note) entry.note = o.note;
  // Half-day absences keep a fraction in (0, 1); anything else is a whole day.
  if (
    type === 'absence' &&
    typeof o.absenceFraction === 'number' &&
    Number.isFinite(o.absenceFraction) &&
    o.absenceFraction > 0 &&
    o.absenceFraction < 1
  ) {
    entry.absenceFraction = o.absenceFraction;
  }
  return entry;
}

function normDays(v: unknown): DayMap {
  const out: DayMap = {};
  if (v && typeof v === 'object') {
    for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      const entry = normEntry(raw);
      if (entry) out[k] = entry;
    }
  }
  return out;
}

function normSettings(v: unknown): Settings {
  const d = defaultSettings();
  const o = (v ?? {}) as Record<string, unknown>;
  const startDate = o.startDate;
  return {
    weeklyHours: asNumber(o.weeklyHours, d.weeklyHours),
    workDaysPerWeek: asNumber(o.workDaysPerWeek, d.workDaysPerWeek),
    targetPerWorkday: asNumber(o.targetPerWorkday, d.targetPerWorkday),
    vacationDaysPerYear: asNumber(o.vacationDaysPerYear, d.vacationDaysPerYear),
    startDate: typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : null,
    openingBalanceHours: asNumber(o.openingBalanceHours, d.openingBalanceHours),
    openingVacationDays: asNumber(o.openingVacationDays, d.openingVacationDays),
  };
}

function normRule(v: unknown): HolidayRule | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = asString(o.id);
  const name = asString(o.name);
  if (!id || !name) return null;
  const kind = o.kind === 'easter' ? 'easter' : 'fixed';
  const rule: HolidayRule = { id, name, kind, enabled: asBool(o.enabled, true) };
  if (kind === 'fixed') {
    rule.month = asNumber(o.month, 1);
    rule.day = asNumber(o.day, 1);
  } else {
    rule.offset = asNumber(o.offset, 0);
  }
  return rule;
}

function normConfig(v: unknown): HolidayRule[] {
  const stored = Array.isArray(v)
    ? v.map(normRule).filter((r): r is HolidayRule => r !== null)
    : [];
  const byId = new Map(stored.map((r) => [r.id, r] as const));
  const defaultIds = new Set(DEFAULT_HOLIDAY_RULES.map((r) => r.id));

  // Always include the full default Swiss set (preserving the user's stored
  // toggles where present), then append any custom rules they added.
  const merged: HolidayRule[] = DEFAULT_HOLIDAY_RULES.map((def) => byId.get(def.id) ?? { ...def });
  for (const r of stored) if (!defaultIds.has(r.id)) merged.push(r);
  return merged;
}

function normCache(v: unknown): Record<number, Holiday[]> {
  const out: Record<number, Holiday[]> = {};
  if (v && typeof v === 'object') {
    for (const [year, list] of Object.entries(v as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const holidays = list
        .map((h): Holiday | null => {
          const o = (h ?? {}) as Record<string, unknown>;
          const date = asString(o.date);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
          return { date, name: asString(o.name) };
        })
        .filter((h): h is Holiday => h !== null);
      out[Number(year)] = holidays;
    }
  }
  return out;
}

/** Coerce arbitrary parsed JSON into a valid TimesheetDoc. */
export function normalizeDoc(raw: unknown): TimesheetDoc {
  if (!raw || typeof raw !== 'object') return defaultDoc();
  const o = raw as Record<string, unknown>;
  const meta = (o.meta ?? {}) as Record<string, unknown>;
  return {
    schemaVersion: 1,
    settings: normSettings(o.settings),
    days: normDays(o.days),
    holidayConfig: normConfig(o.holidayConfig),
    holidayCache: normCache(o.holidayCache),
    meta: {
      lastHolidaySync:
        typeof meta.lastHolidaySync === 'string' ? (meta.lastHolidaySync as string) : null,
      holidaySource:
        meta.holidaySource === 'online' || meta.holidaySource === 'computed'
          ? meta.holidaySource
          : null,
    },
  };
}

export function loadLocal(): TimesheetDoc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDoc();
    return normalizeDoc(JSON.parse(raw));
  } catch {
    return defaultDoc();
  }
}

export function saveLocal(doc: TimesheetDoc): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    /* storage unavailable (e.g. file:// restrictions) — rely on Export/Import */
  }
}

export function exportJson(doc: TimesheetDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `habeas-clockus-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importJson(file: File): Promise<TimesheetDoc> {
  return file.text().then((text) => normalizeDoc(JSON.parse(text)));
}
