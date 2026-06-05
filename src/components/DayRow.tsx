import { Index, Show, type Component } from 'solid-js';

import { dayBalance } from '../lib/balance';
import { formatDayLabel, formatSigned, isWeekend } from '../lib/date';
import { dayWorkedHours, rangeHasWarning } from '../lib/hours';
import { isWorkingDay } from '../lib/workday';
import type { DateKey, DayKind } from '../model/types';
import { useTimesheet } from '../store/context';
import TimeInput from './TimeInput';

const DayRow: Component<{ date: DateKey; today: DateKey }> = (props) => {
  const ts = useTimesheet();

  const entry = () => ts.getEntry(props.date);
  // Placeholder rows when the day has no entry yet.
  const ranges = () => entry()?.ranges ?? [{ start: '', end: '' }];
  const breaks = () => entry()?.breaks ?? [''];
  const holiday = () => ts.holidayName(props.date);
  const weekend = () => isWeekend(props.date);
  const working = () => isWorkingDay(props.date, ts.isHoliday);
  const isAbsence = () => entry()?.type === 'absence';
  const isCompensation = () => entry()?.type === 'compensation';
  const dayKind = (): DayKind => {
    const e = entry();
    if (!e) return 'work';
    if (e.type === 'compensation') return 'kompensation';
    if (e.type === 'absence') return e.note === 'Krank' ? 'krank' : 'ferien';
    return 'work';
  };
  const beforeStart = () =>
    !!ts.doc.settings.startDate && props.date < ts.doc.settings.startDate;
  const worked = () => dayWorkedHours(entry());
  const bal = () => dayBalance(props.date, entry(), ts.doc.settings, ts.isHoliday, props.today);

  return (
    <div
      class="day-row"
      classList={{
        weekend: weekend(),
        holiday: holiday() !== undefined,
        absence: isAbsence(),
        compensation: isCompensation(),
        today: props.date === props.today,
        nonworking: !working(),
        'before-start': beforeStart(),
      }}
    >
      <div class="day-label">
        <span class="day-date">{formatDayLabel(props.date)}</span>
        <Show when={holiday()}>
          <span class="day-tag holiday-tag">{holiday()}</span>
        </Show>
        <Show when={!holiday() && weekend()}>
          <span class="day-tag">Wochenende</span>
        </Show>
        <Show when={(isAbsence() || isCompensation()) && entry()?.note}>
          <span
            class="day-tag"
            classList={{ 'absence-tag': isAbsence(), 'comp-tag': isCompensation() }}
          >
            {entry()?.note}
          </span>
        </Show>
        <Show when={beforeStart()}>
          <span class="day-tag">nicht berechnet</span>
        </Show>
      </div>

      <div class="day-times">
        <div class="time-block">
          <Index each={ranges()}>
            {(r, i) => (
              <span class="time-pair">
                <span class="field-label">Von</span>
                <TimeInput
                  value={r().start}
                  onChange={(v) => ts.setRange(props.date, i, 'start', v)}
                  warn={rangeHasWarning(r())}
                />
                <span class="field-label">Bis</span>
                <TimeInput
                  value={r().end}
                  onChange={(v) => ts.setRange(props.date, i, 'end', v)}
                  warn={rangeHasWarning(r())}
                />
                <Show when={ranges().length > 1 || r().start !== '' || r().end !== ''}>
                  <button
                    class="range-remove"
                    title={ranges().length > 1 ? 'Zeitspanne entfernen' : 'Felder leeren'}
                    onClick={() =>
                      ranges().length > 1
                        ? ts.removeRange(props.date, i)
                        : ts.clearRange(props.date, i)
                    }
                  >
                    ✕
                  </button>
                </Show>
              </span>
            )}
          </Index>
          <button class="range-add" onClick={() => ts.addRange(props.date)}>
            + Zeit
          </button>
        </div>

        <div class="break-block">
          <Index each={breaks()}>
            {(b, i) => (
              <span class="time-pair">
                <span class="field-label">Pause</span>
                <TimeInput
                  value={b()}
                  onChange={(v) => ts.setBreak(props.date, i, v)}
                  placeholder="Std:Min"
                />
                <button
                  class="range-remove"
                  title="Pause entfernen"
                  onClick={() => ts.removeBreak(props.date, i)}
                >
                  ✕
                </button>
              </span>
            )}
          </Index>
          <button class="range-add" onClick={() => ts.addBreak(props.date)}>
            + Pause
          </button>
        </div>
      </div>

      <div class="day-worked">{worked() > 0 ? `${worked().toFixed(2)} h` : '—'}</div>

      <div class="day-balance">
        <Show when={bal().counted} fallback={<span class="muted">—</span>}>
          <span classList={{ pos: bal().balance > 0, neg: bal().balance < 0 }}>
            {formatSigned(bal().balance)}
          </span>
        </Show>
      </div>

      <Show when={working()} fallback={<span class="day-absence" />}>
        <div class="day-absence">
          <select
            class="absence-select"
            title="Tagesstatus: Ferien/Krank zählen nicht gegen das Soll; Kompensation zieht den Tag vom Überstundensaldo ab"
            value={dayKind()}
            onChange={(e) => ts.setDayKind(props.date, e.currentTarget.value as DayKind)}
          >
            <option value="work">Anwesend</option>
            <option value="ferien">Ferien</option>
            <option value="krank">Krank</option>
            <option value="kompensation">Kompensation</option>
          </select>
        </div>
      </Show>
    </div>
  );
};

export default DayRow;
