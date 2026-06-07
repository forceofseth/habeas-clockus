import { createEffect, createSignal } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';

import { addDays, todayKey, yearOf } from '../lib/date';
import type { FileBackend } from '../lib/fileStore';
import { buildHolidayMap, resolveRules } from '../lib/holidays';
import { normalizeDoc } from '../lib/storage';
import { isWorkingDay } from '../lib/workday';
import type {
  DateKey,
  DayEntry,
  DayKind,
  Holiday,
  HolidayRule,
  Settings,
  TimeRange,
  TimesheetDoc,
} from '../model/types';

function emptyRange(): TimeRange {
  return { start: '', end: '' };
}

function emptyEntry(): DayEntry {
  // One work span (From–To) and one empty break row by default.
  return { ranges: [emptyRange()], breaks: [''], type: 'work' };
}

export type TimesheetStore = ReturnType<typeof createTimesheetStore>;

export type SaveState = 'saved' | 'saving' | 'error';
export interface Conflict {
  theirsJson: string;
}

/** Canonical JSON form, so formatting/key-order differences don't read as changes. */
function canonical(text: string | null): string | null {
  if (text === null) return null;
  try {
    return JSON.stringify(normalizeDoc(JSON.parse(text)), null, 2);
  } catch {
    return null;
  }
}

export function createTimesheetStore(initialDoc: TimesheetDoc, backend: FileBackend) {
  const [doc, setDoc] = createStore<TimesheetDoc>(initialDoc);
  const [saveState, setSaveState] = createSignal<SaveState>('saved');
  const [conflict, setConflict] = createSignal<Conflict | null>(null);

  // What we believe is currently on disk (canonical form).
  let baseline = JSON.stringify(initialDoc, null, 2);

  // Debounced, guarded persistence. Every change is written ~600 ms after you
  // stop editing — but only if the file hasn't been changed by another device.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: string | null = null;

  const flush = async () => {
    if (pending === null || conflict()) return;
    const json = pending;
    pending = null;
    try {
      const disk = canonical(await backend.read());
      if (disk !== null && disk !== baseline) {
        // Another device wrote since our baseline → don't clobber it.
        setConflict({ theirsJson: disk });
        return;
      }
      await backend.write(json);
      baseline = json;
      setSaveState(pending === null ? 'saved' : 'saving');
    } catch {
      setSaveState('error');
    }
    if (pending !== null && !conflict()) void flush();
  };

  // The effect reads the whole document (so it tracks every nested property);
  // the first run just establishes tracking without re-saving the loaded file.
  let first = true;
  createEffect(() => {
    const json = JSON.stringify(doc, null, 2);
    if (first) {
      first = false;
      return;
    }
    pending = json;
    setSaveState('saving');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), 600);
  });

  /** Check whether another device changed the file; reload or flag a conflict. */
  async function checkExternal() {
    if (conflict()) return;
    const disk = canonical(await backend.read());
    if (disk === null || disk === baseline) return;
    const mine = JSON.stringify(doc, null, 2);
    if (mine === baseline) {
      // No local edits → safely adopt the other device's version.
      setDoc(reconcile(normalizeDoc(JSON.parse(disk))));
      baseline = disk;
      setSaveState('saved');
    } else {
      setConflict({ theirsJson: disk });
    }
  }

  /** Resolve a conflict: keep theirs (reload) or keep mine (backup theirs, overwrite). */
  async function resolveConflict(choice: 'mine' | 'theirs') {
    const c = conflict();
    if (!c) return;
    if (choice === 'theirs') {
      setDoc(reconcile(normalizeDoc(JSON.parse(c.theirsJson))));
      baseline = c.theirsJson;
      setConflict(null);
      setSaveState('saved');
    } else {
      try {
        await backend.backup(c.theirsJson);
        const mine = JSON.stringify(doc, null, 2);
        await backend.write(mine);
        baseline = mine;
        setConflict(null);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }
  }

  function ensureDay(date: DateKey) {
    if (!doc.days[date]) setDoc('days', date, emptyEntry());
  }

  function setRange(date: DateKey, index: number, field: 'start' | 'end', value: string) {
    ensureDay(date);
    setDoc('days', date, 'ranges', index, field, value);
  }

  function addRange(date: DateKey) {
    ensureDay(date);
    setDoc('days', date, 'ranges', (rs) => [...rs, emptyRange()]);
  }

  function removeRange(date: DateKey, index: number) {
    if (!doc.days[date]) return;
    setDoc('days', date, 'ranges', (rs) => (rs.length > 1 ? rs.filter((_, i) => i !== index) : rs));
  }

  function clearRange(date: DateKey, index: number) {
    if (!doc.days[date]) return;
    setDoc('days', date, 'ranges', index, { start: '', end: '' });
  }

  function setBreak(date: DateKey, index: number, value: string) {
    ensureDay(date);
    setDoc('days', date, 'breaks', index, value);
  }

  function addBreak(date: DateKey) {
    ensureDay(date);
    setDoc('days', date, 'breaks', (bs) => [...bs, '']);
  }

  function removeBreak(date: DateKey, index: number) {
    if (!doc.days[date]) return;
    setDoc('days', date, 'breaks', (bs) => bs.filter((_, i) => i !== index));
  }

  function applyKind(date: DateKey, kind: DayKind, fraction = 1) {
    ensureDay(date);
    // Only a partial (< 1) absence carries a fraction; whole days clear the field.
    const half = fraction < 1 ? fraction : undefined;
    switch (kind) {
      case 'ferien':
        setDoc('days', date, 'type', 'absence');
        setDoc('days', date, 'note', 'Ferien');
        setDoc('days', date, 'absenceFraction', half);
        break;
      case 'krank':
        setDoc('days', date, 'type', 'absence');
        setDoc('days', date, 'note', 'Krank');
        setDoc('days', date, 'absenceFraction', half);
        break;
      case 'kompensation':
        setDoc('days', date, 'type', 'compensation');
        setDoc('days', date, 'note', 'Kompensation');
        setDoc('days', date, 'absenceFraction', undefined);
        break;
      default:
        setDoc('days', date, 'type', 'work');
        setDoc('days', date, 'note', undefined);
        setDoc('days', date, 'absenceFraction', undefined);
    }
  }

  /**
   * Set a single day's status (present / vacation / sick / compensation).
   * `fraction` < 1 marks a partial absence (0.5 = half day).
   */
  function setDayKind(date: DateKey, kind: DayKind, fraction = 1) {
    applyKind(date, kind, fraction);
  }

  /** Apply a status to every working day in [from, to] (skips weekends/holidays). */
  function markRange(from: DateKey, to: DateKey, kind: DayKind, fraction = 1) {
    let start = from;
    let end = to;
    if (start > end) [start, end] = [end, start];
    let cur = start;
    let guard = 0;
    while (cur <= end && guard < 2000) {
      if (isWorkingDay(cur, isHoliday)) applyKind(cur, kind, fraction);
      cur = addDays(cur, 1);
      guard++;
    }
  }

  function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDoc('settings', key, value);
  }

  function replaceAll(next: TimesheetDoc) {
    setDoc(reconcile(next));
  }

  // ── Holiday config + cache ──────────────────────────────────────────────────

  // Rebuild every cached year from the current enabled config so toggles/edits
  // immediately affect working-day logic. (Resolved names come from the rules.)
  function recomputeCachedYears() {
    for (const year of Object.keys(doc.holidayCache)) {
      setDoc('holidayCache', Number(year), resolveRules(doc.holidayConfig, Number(year)));
    }
  }

  function toggleHoliday(id: string) {
    setDoc('holidayConfig', (r) => r.id === id, 'enabled', (e) => !e);
    recomputeCachedYears();
  }

  function updateHoliday(id: string, patch: Partial<HolidayRule>) {
    const idx = doc.holidayConfig.findIndex((r) => r.id === id);
    if (idx >= 0) setDoc('holidayConfig', idx, patch);
    recomputeCachedYears();
  }

  function addHoliday(rule: HolidayRule) {
    setDoc('holidayConfig', (list) => [...list, rule]);
    recomputeCachedYears();
  }

  function removeHoliday(id: string) {
    setDoc('holidayConfig', (list) => list.filter((r) => r.id !== id));
    recomputeCachedYears();
  }

  function setHolidayCacheYear(year: number, holidays: Holiday[], source: 'online' | 'computed') {
    setDoc('holidayCache', year, holidays);
    setDoc('meta', { lastHolidaySync: todayKey(), holidaySource: source });
  }

  // ── Reactive lookups (read inside memos/JSX stay reactive) ───────────────────

  function holidayName(k: DateKey): string | undefined {
    const year = yearOf(k);
    const cached = doc.holidayCache[year];
    if (cached) return cached.find((h) => h.date === k)?.name;
    return buildHolidayMap(doc.holidayConfig, year).get(k)?.name;
  }

  function isHoliday(k: DateKey): boolean {
    return holidayName(k) !== undefined;
  }

  function getEntry(k: DateKey): DayEntry | undefined {
    return doc.days[k];
  }

  return {
    doc,
    saveState,
    conflict,
    checkExternal,
    resolveConflict,
    setRange,
    addRange,
    removeRange,
    clearRange,
    setBreak,
    addBreak,
    removeBreak,
    setDayKind,
    markRange,
    setSetting,
    replaceAll,
    toggleHoliday,
    updateHoliday,
    addHoliday,
    removeHoliday,
    setHolidayCacheYear,
    holidayName,
    isHoliday,
    getEntry,
  };
}
