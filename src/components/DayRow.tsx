import { Index, Show, type Component } from 'solid-js';

import { dayBalance } from '../lib/balance';
import { formatDayLabel, formatSigned, isWeekend } from '../lib/date';
import { dayWorkedHours, rangeHasWarning } from '../lib/hours';
import { absenceFractionOf, isWorkingDay } from '../lib/workday';
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
  const isHalf = () => isAbsence() && absenceFractionOf(entry()) < 1;
  // The <select> value encodes the half-day fraction, e.g. "ferien:0.5".
  const selectValue = (): string => {
    const k = dayKind();
    return (k === 'ferien' || k === 'krank') && isHalf() ? `${k}:0.5` : k;
  };
  const onKindChange = (value: string) => {
    const [k, frac] = value.split(':');
    ts.setDayKind(props.date, k as DayKind, frac ? Number(frac) : 1);
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
            {isHalf() ? ' ½' : ''}
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
                  disabled={beforeStart()}
                />
                <span class="field-label">Bis</span>
                <TimeInput
                  value={r().end}
                  onChange={(v) => ts.setRange(props.date, i, 'end', v)}
                  warn={rangeHasWarning(r())}
                  disabled={beforeStart()}
                />
                <Show when={!beforeStart() && (ranges().length > 1 || r().start !== '' || r().end !== '')}>
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
          <Show when={!beforeStart()}>
            <button class="range-add" onClick={() => ts.addRange(props.date)}>
              + Zeit
            </button>
          </Show>
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
                  disabled={beforeStart()}
                />
                <Show when={!beforeStart()}>
                  <button
                    class="range-remove"
                    title="Pause entfernen"
                    onClick={() => ts.removeBreak(props.date, i)}
                  >
                    ✕
                  </button>
                </Show>
              </span>
            )}
          </Index>
          <Show when={!beforeStart()}>
            <button class="range-add" onClick={() => ts.addBreak(props.date)}>
              + Pause
            </button>
          </Show>
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
            title="Tagesstatus: Ferien/Krank zählen nicht gegen das Soll; ein halber Tag zählt nur zur Hälfte. Kompensation zieht den Tag vom Überstundensaldo ab"
            value={selectValue()}
            disabled={beforeStart()}
            onChange={(e) => onKindChange(e.currentTarget.value)}
          >
            <option value="work">Anwesend</option>
            <option value="ferien">Ferien</option>
            <option value="ferien:0.5">Ferien (½ Tag)</option>
            <option value="krank">Krank</option>
            <option value="krank:0.5">Krank (½ Tag)</option>
            <option value="kompensation">Kompensation</option>
          </select>
        </div>
      </Show>
    </div>
  );
};

export default DayRow;
