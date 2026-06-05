import { For, createMemo, type Component } from 'solid-js';

import { weekRange } from '../lib/date';
import type { DateKey } from '../model/types';
import DayRow from './DayRow';

const WeekView: Component<{ anchor: DateKey; today: DateKey }> = (props) => {
  const days = createMemo(() => weekRange(props.anchor));
  return (
    <div class="day-table">
      <div class="day-row head">
        <div class="day-label">Tag</div>
        <div class="day-times">
          <span class="time-pair">Arbeitszeit &amp; Pausen</span>
        </div>
        <div class="day-worked">Ist</div>
        <div class="day-balance">Saldo</div>
        <div class="day-absence">Status</div>
      </div>
      <For each={days()}>{(d) => <DayRow date={d} today={props.today} />}</For>
    </div>
  );
};

export default WeekView;
