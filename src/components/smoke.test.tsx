import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@solidjs/testing-library';

import TotalsBar from './TotalsBar';
import WeekView from './WeekView';
import { weekRange } from '../lib/date';
import { defaultDoc } from '../model/defaults';
import type { FileBackend } from '../lib/fileStore';
import { TimesheetProvider } from '../store/context';

afterEach(cleanup);

// In-memory backend so the store never touches Tauri/localStorage during tests.
const backend: FileBackend = {
  write: async () => {},
};

const TODAY = '2026-06-29'; // Monday — the test week below is fully in the past
const ANCHOR = '2026-06-15'; // week Mon 15 … Sun 21

function renderTracker() {
  return render(() => (
    <TimesheetProvider initialDoc={defaultDoc()} backend={backend}>
      <TotalsBar range={weekRange(ANCHOR)} today={TODAY} view="week" year={2026} />
      <WeekView anchor={ANCHOR} today={TODAY} />
    </TimesheetProvider>
  ));
}

const dayRows = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('.day-row')).filter((r) => !r.classList.contains('head'));

describe('tracker smoke tests (click + type)', () => {
  it('renders a full Mon–Sun week', () => {
    const { container } = renderTracker();
    expect(dayRows(container)).toHaveLength(7);
  });

  it('typing Von/Bis updates the day total and the period Ist', () => {
    const { container } = renderTracker();
    const mon = dayRows(container)[0]; // 2026-06-15
    const inputs = mon.querySelectorAll<HTMLInputElement>('.time-block .time-input');

    fireEvent.input(inputs[0], { target: { value: '0800' } }); // Von → 08:00
    fireEvent.input(inputs[1], { target: { value: '1200' } }); // Bis → 12:00

    expect(inputs[0].value).toBe('08:00'); // live colon formatting
    expect(mon.querySelector('.day-worked')?.textContent).toContain('4.00');
    expect(container.querySelector('.totals-bar')?.textContent).toContain('4.00'); // Ist
  });

  it('a break is subtracted from the worked total', () => {
    const { container } = renderTracker();
    const mon = dayRows(container)[0];
    const work = mon.querySelectorAll<HTMLInputElement>('.time-block .time-input');
    fireEvent.input(work[0], { target: { value: '0800' } });
    fireEvent.input(work[1], { target: { value: '1700' } }); // 9h
    const pause = mon.querySelector<HTMLInputElement>('.break-block .time-input')!;
    fireEvent.input(pause, { target: { value: '0100' } }); // 1h break
    expect(mon.querySelector('.day-worked')?.textContent).toContain('8.00');
  });

  it('marking a day as Ferien tags it and keeps it neutral (no negative)', () => {
    const { container } = renderTracker();
    const mon = dayRows(container)[0];
    const select = mon.querySelector<HTMLSelectElement>('.absence-select')!;
    fireEvent.change(select, { target: { value: 'ferien' } });
    expect(mon.textContent).toContain('Ferien');
    // balance cell should not show a negative value for a vacation day
    expect(mon.querySelector('.day-balance')?.textContent).not.toContain('−8');
  });

  it('an empty past working day shows the owed −8.40 balance', () => {
    const { container } = renderTracker();
    const mon = dayRows(container)[0];
    expect(mon.querySelector('.day-balance')?.textContent).toContain('8.40');
  });
});
