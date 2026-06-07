import { createSignal, Show, type Component } from 'solid-js';

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
  const [half, setHalf] = createSignal(false);

  const valid = () => from() !== '' && to() !== '' && from() <= to();
  // Half days apply to Ferien/Krank only (not Kompensation).
  const supportsHalf = () => kind() === 'ferien' || kind() === 'krank';

  function apply() {
    if (!valid()) return;
    ts.markRange(from(), to(), kind(), supportsHalf() && half() ? 0.5 : 1);
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

        <Show when={supportsHalf()}>
          <label class="modal-check">
            <input
              type="checkbox"
              checked={half()}
              onChange={(e) => setHalf(e.currentTarget.checked)}
            />
            Halber Tag (½)
          </label>
        </Show>

        <p class="hint">
          Alle Arbeitstage im Zeitraum werden als «{LABEL[kind()]}
          {supportsHalf() && half() ? ' ½' : ''}» markiert.
          {kind() === 'kompensation'
            ? ' Diese Tage werden vom Überstundensaldo abgezogen.'
            : supportsHalf() && half()
              ? ' Sie zählen je zur Hälfte gegen Soll und Ferienanspruch.'
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
