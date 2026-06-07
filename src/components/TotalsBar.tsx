import { createMemo, type Component } from 'solid-js';

import { cumulativeBalance, periodTotals, vacationInfo } from '../lib/balance';
import { formatHours, formatSigned } from '../lib/date';
import type { DateKey } from '../model/types';
import { useTimesheet } from '../store/context';

const balanceClass = (v: number) => ({ pos: v > 0, neg: v < 0 });

const TotalsBar: Component<{
  range: DateKey[];
  today: DateKey;
  view: 'week' | 'month';
  year: number;
}> = (props) => {
  const ts = useTimesheet();
  const periodWord = () => (props.view === 'week' ? 'Woche' : 'Monat');

  const period = createMemo(() =>
    periodTotals(props.range, ts.doc.days, ts.doc.settings, ts.isHoliday, props.today),
  );
  const cumulative = createMemo(() =>
    cumulativeBalance(ts.doc.days, ts.doc.settings, ts.isHoliday, props.today),
  );

  const vac = createMemo(() => vacationInfo(ts.doc.days, ts.doc.settings, props.year));

  return (
    <div class="totals-bar">
      <div class="total" title={`Geleistete Arbeitszeit in dieser ${periodWord()}`}>
        <span class="total-label">Ist ({periodWord()})</span>
        <span class="total-value">{formatHours(period().worked)}</span>
      </div>
      <div class="total" title={`Soll-Arbeitszeit in dieser ${periodWord()} (8.4 h pro Arbeitstag)`}>
        <span class="total-label">Soll ({periodWord()})</span>
        <span class="total-value">{formatHours(period().target)}</span>
      </div>
      <div
        class="total"
        title={`Über-/Unterzeit in dieser ${periodWord()} (Ist − Soll). Ein Tag zählt, sobald Zeit erfasst ist; leere Tage erst, wenn sie vorbei sind.`}
      >
        <span class="total-label">Saldo {periodWord()}</span>
        <span class="total-value" classList={balanceClass(period().balance)}>
          {formatSigned(period().balance)}
        </span>
      </div>
      <div
        class="total total-cumulative"
        title="Gesamte Über-/Unterzeit seit Beschäftigungsbeginn bis heute"
      >
        <span class="total-label">Saldo gesamt</span>
        <span class="total-value" classList={balanceClass(cumulative())}>
          {formatSigned(cumulative())}
        </span>
      </div>
      <div
        class="total total-vacation"
        title={
          vac().applicable
            ? `${vac().taken} Ferientage bezogen, ${vac().remaining} von ${vac().entitlement} übrig` +
              (vac().carriedOver !== 0 ? ` (inkl. ${vac().carriedOver} übertragen aus Vorjahr)` : '')
            : 'Vor dem Startdatum – nicht berechnet'
        }
      >
        <span class="total-label">Ferien {props.year}</span>
        <span class="total-value" classList={{ neg: vac().applicable && vac().remaining < 0 }}>
          {vac().applicable ? `${vac().remaining} / ${vac().entitlement}` : '—'}
        </span>
      </div>
    </div>
  );
};

export default TotalsBar;
