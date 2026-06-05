import { createSignal, type Component } from 'solid-js';

import { todayKey } from '../lib/date';
import type { DayKind } from '../model/types';
import { useTimesheet } from '../store/context';
import DatePicker from './DatePicker';

const LABEL: Record<Exclude<DayKind, 'work'>, string> = {
  ferien: 'Ferien',
  krank: 'Krank',
  kompensation: 'Kompensation',
};

const AbsenceWizard: Component<{ onClose: () => void }> = (props) => {
  const ts = useTimesheet();
  const [kind, setKind] = createSignal<Exclude<DayKind, 'work'>>('ferien');
  const [from, setFrom] = createSignal(todayKey());
  const [to, setTo] = createSignal(todayKey());

  const valid = () => from() !== '' && to() !== '' && from() <= to();

  function apply() {
    if (!valid()) return;
    ts.markRange(from(), to(), kind());
    props.onClose();
  }

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Abwesenheit</h2>

        <label>
          Art
          <select
            value={kind()}
            onChange={(e) => setKind(e.currentTarget.value as Exclude<DayKind, 'work'>)}
          >
            <option value="ferien">Ferien</option>
            <option value="krank">Krank</option>
            <option value="kompensation">Kompensation</option>
          </select>
        </label>

        <div class="modal-dates">
          <label>
            Von
            <DatePicker value={from()} onChange={setFrom} />
          </label>
          <label>
            Bis
            <DatePicker value={to()} onChange={setTo} />
          </label>
        </div>

        <p class="hint">
          Alle Arbeitstage im Zeitraum werden als «{LABEL[kind()]}» markiert.
          {kind() === 'kompensation'
            ? ' Diese Tage werden vom Überstundensaldo abgezogen.'
            : ' Diese Tage zählen nicht gegen das Soll.'}{' '}
          Wochenenden und Feiertage werden übersprungen.
        </p>

        <div class="modal-actions">
          <button onClick={props.onClose}>Abbrechen</button>
          <button class="primary" disabled={!valid()} onClick={apply}>
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbsenceWizard;
