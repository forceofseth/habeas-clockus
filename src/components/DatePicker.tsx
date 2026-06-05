import {
  For,
  Match,
  Show,
  Switch,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from 'solid-js';

import { fromKey, localDate, toKey, todayKey, weekdayMon0 } from '../lib/date';

const MONTHS_FULL = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const labelFmt = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

type Mode = 'days' | 'months' | 'years';

const DatePicker: Component<{
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  clearable?: boolean;
}> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [mode, setMode] = createSignal<Mode>('days');
  const [vy, setVy] = createSignal(Number((props.value || todayKey()).slice(0, 4)));
  const [vm, setVm] = createSignal(Number((props.value || todayKey()).slice(5, 7))); // 1–12
  const [yearPage, setYearPage] = createSignal(0);

  function openPicker() {
    const b = props.value || todayKey();
    setVy(Number(b.slice(0, 4)));
    setVm(Number(b.slice(5, 7)));
    setMode('days');
    setOpen(true);
  }
  function toggle() {
    open() ? setOpen(false) : openPicker();
  }

  function prev() {
    if (mode() === 'days') vm() === 1 ? (setVm(12), setVy(vy() - 1)) : setVm(vm() - 1);
    else if (mode() === 'months') setVy(vy() - 1);
    else setYearPage(yearPage() - 12);
  }
  function next() {
    if (mode() === 'days') vm() === 12 ? (setVm(1), setVy(vy() + 1)) : setVm(vm() + 1);
    else if (mode() === 'months') setVy(vy() + 1);
    else setYearPage(yearPage() + 12);
  }
  function onTitle() {
    if (mode() === 'days') setMode('months');
    else if (mode() === 'months') {
      setYearPage(Math.floor(vy() / 12) * 12);
      setMode('years');
    }
  }

  const title = () => {
    if (mode() === 'days') return `${MONTHS_FULL[vm() - 1]} ${vy()}`;
    if (mode() === 'months') return String(vy());
    return `${yearPage()} – ${yearPage() + 11}`;
  };

  const cells = createMemo<(string | null)[]>(() => {
    const year = vy();
    const month = vm();
    const lead = weekdayMon0(toKey(localDate(year, month, 1)));
    const daysInMonth = new Date(year, month, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(toKey(localDate(year, month, d)));
    return out;
  });
  const years = () => Array.from({ length: 12 }, (_, i) => yearPage() + i);

  const valueYear = () => (props.value ? Number(props.value.slice(0, 4)) : null);
  const valueMonth = () => (props.value ? Number(props.value.slice(5, 7)) : null);

  function pickDay(k: string) {
    props.onChange(k);
    setOpen(false);
  }

  let root: HTMLDivElement | undefined;
  const onDocDown = (e: MouseEvent) => {
    if (open() && root && !root.contains(e.target as Node)) setOpen(false);
  };
  onMount(() => document.addEventListener('mousedown', onDocDown));
  onCleanup(() => document.removeEventListener('mousedown', onDocDown));

  const label = () => (props.value ? labelFmt.format(fromKey(props.value)) : 'Datum wählen');

  return (
    <div class="datepicker" ref={root}>
      <button type="button" class="dp-trigger" onClick={toggle}>
        {label()}
      </button>
      <Show when={props.clearable && props.value}>
        <button type="button" class="dp-clear" title="Datum entfernen" onClick={() => props.onChange('')}>
          ✕
        </button>
      </Show>

      <Show when={open()}>
        <div class="dp-pop">
          <div class="dp-head">
            <button type="button" class="dp-nav" onClick={prev} aria-label="Zurück">
              ‹
            </button>
            <button type="button" class="dp-title" onClick={onTitle}>
              {title()}
            </button>
            <button type="button" class="dp-nav" onClick={next} aria-label="Weiter">
              ›
            </button>
          </div>

          <Switch>
            <Match when={mode() === 'days'}>
              <div class="dp-grid dp-weekdays">
                <For each={WEEKDAYS}>{(w) => <span class="dp-wd">{w}</span>}</For>
              </div>
              <div class="dp-grid">
                <For each={cells()}>
                  {(c) => (
                    <Show when={c} fallback={<span class="dp-empty" />}>
                      <button
                        type="button"
                        class="dp-day"
                        classList={{ selected: c === props.value, today: c === todayKey() }}
                        onClick={() => pickDay(c!)}
                      >
                        {Number(c!.slice(8, 10))}
                      </button>
                    </Show>
                  )}
                </For>
              </div>
            </Match>

            <Match when={mode() === 'months'}>
              <div class="dp-cells">
                <For each={MONTHS_SHORT}>
                  {(m, i) => (
                    <button
                      type="button"
                      class="dp-cell"
                      classList={{ selected: valueYear() === vy() && valueMonth() === i() + 1 }}
                      onClick={() => {
                        setVm(i() + 1);
                        setMode('days');
                      }}
                    >
                      {m}
                    </button>
                  )}
                </For>
              </div>
            </Match>

            <Match when={mode() === 'years'}>
              <div class="dp-cells">
                <For each={years()}>
                  {(y) => (
                    <button
                      type="button"
                      class="dp-cell"
                      classList={{ selected: valueYear() === y }}
                      onClick={() => {
                        setVy(y);
                        setMode('months');
                      }}
                    >
                      {y}
                    </button>
                  )}
                </For>
              </div>
            </Match>
          </Switch>
        </div>
      </Show>
    </div>
  );
};

export default DatePicker;
