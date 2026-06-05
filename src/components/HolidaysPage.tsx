import { For, Show, createSignal, type Component } from 'solid-js';

import { formatDayLabel, todayKey, yearOf } from '../lib/date';
import { resolveRuleDate } from '../lib/holidays';
import type { HolidayRule } from '../model/types';
import { useTimesheet } from '../store/context';
import DatePicker from './DatePicker';

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function ruleDescription(rule: HolidayRule): string {
  if (rule.kind === 'fixed') return `Fix: ${rule.day}.${rule.month}.`;
  const o = rule.offset ?? 0;
  if (o === 0) return 'Ostersonntag';
  return `Ostern ${o > 0 ? '+' : '−'}${Math.abs(o)} Tage`;
}

const HolidaysPage: Component<{
  onClose: () => void;
  desktop: boolean;
  filePath: string | null;
  onOpenFile: () => void;
  onCreateFile: () => void;
}> = (props) => {
  const ts = useTimesheet();
  const year = () => yearOf(todayKey());

  // Show the holidays in calendar order (by their resolved date this year).
  const sortedRules = () =>
    [...ts.doc.holidayConfig].sort((a, b) => {
      const da = resolveRuleDate(a, year()) ?? '';
      const db = resolveRuleDate(b, year()) ?? '';
      return da < db ? -1 : da > db ? 1 : 0;
    });

  const [name, setName] = createSignal('');
  const [kind, setKind] = createSignal<'fixed' | 'easter'>('fixed');
  const [month, setMonth] = createSignal(1);
  const [day, setDay] = createSignal(1);
  const [offset, setOffset] = createSignal(0);

  function addRule(e: Event) {
    e.preventDefault();
    const n = name().trim();
    if (!n) return;
    let id = slug(n) || 'feiertag';
    const existing = new Set(ts.doc.holidayConfig.map((r) => r.id));
    if (existing.has(id)) {
      let i = 2;
      while (existing.has(`${id}-${i}`)) i++;
      id = `${id}-${i}`;
    }
    const rule: HolidayRule =
      kind() === 'fixed'
        ? { id, name: n, kind: 'fixed', month: month(), day: day(), enabled: true }
        : { id, name: n, kind: 'easter', offset: offset(), enabled: true };
    ts.addHoliday(rule);
    setName('');
  }

  function dateLabel(rule: HolidayRule): string {
    const d = resolveRuleDate(rule, year());
    return d ? formatDayLabel(d) : '—';
  }

  return (
    <div class="holidays-page">
      <div class="page-head">
        <button class="back" onClick={props.onClose}>
          ← Zurück
        </button>
        <h2>Settings</h2>
      </div>

      <Show when={props.desktop}>
        <section class="settings-block">
          <h3>Datei</h3>
          <p class="file-path" title={props.filePath ?? ''}>
            {props.filePath ?? 'Keine Datei verbunden'}
          </p>
          <p class="hint">
            Alle Änderungen werden sofort in diese Datei geschrieben. Lege sie in deinen
            Cloud-Ordner (z.&nbsp;B. Dropbox), um sie zu sichern.
          </p>
          <div class="file-actions">
            <button onClick={props.onOpenFile}>Andere Datei öffnen</button>
            <button onClick={props.onCreateFile}>Neue Datei erstellen</button>
          </div>
        </section>
      </Show>

      <section class="settings-block">
        <h3>Beschäftigungsbeginn &amp; Startsaldo</h3>
        <label>
          Startdatum
          <DatePicker
            value={ts.doc.settings.startDate ?? ''}
            clearable
            onChange={(v) => ts.setSetting('startDate', v || null)}
          />
        </label>
        <label>
          Startsaldo Gleitzeit (Stunden, +/−)
          <input
            type="number"
            step="0.1"
            value={ts.doc.settings.openingBalanceHours}
            onInput={(e) =>
              ts.setSetting('openingBalanceHours', Number(e.currentTarget.value) || 0)
            }
          />
        </label>
        <label>
          Resturlaub am Startdatum (Tage)
          <input
            type="number"
            min="0"
            max="366"
            value={ts.doc.settings.openingVacationDays}
            onInput={(e) =>
              ts.setSetting('openingVacationDays', Math.max(0, Number(e.currentTarget.value) || 0))
            }
          />
        </label>
        <p class="hint">
          Trage hier den vor der Nutzung dieser App berechneten Saldo ein. Er gilt ab dem Startdatum
          und wird mit den hier erfassten Zeiten verrechnet.
        </p>
      </section>

      <section class="settings-block">
        <h3>Ferienanspruch</h3>
        <label>
          Ferientage pro Jahr
          <input
            type="number"
            min="0"
            max="366"
            value={ts.doc.settings.vacationDaysPerYear}
            onInput={(e) =>
              ts.setSetting('vacationDaysPerYear', Math.max(0, Number(e.currentTarget.value) || 0))
            }
          />
        </label>
      </section>

      <section class="holiday-list">
        <h3>Feiertage {year()}</h3>
        <p class="hint">Aktivierte Feiertage gelten als arbeitsfreie Tage (Soll 0 h).</p>
        <p class="hint">
          Quelle:{' '}
          <strong>
            {ts.doc.meta.holidaySource === 'online'
              ? 'online (date.nager.at)'
              : ts.doc.meta.holidaySource === 'computed'
                ? 'berechnet'
                : '—'}
          </strong>
          <Show when={ts.doc.meta.lastHolidaySync}>
            {' '}· zuletzt aktualisiert {ts.doc.meta.lastHolidaySync}
          </Show>
        </p>
        <For each={sortedRules()}>
          {(rule) => (
            <div class="holiday-item" classList={{ disabled: !rule.enabled }}>
              <label class="holiday-toggle">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => ts.toggleHoliday(rule.id)}
                />
                <span class="holiday-name">{rule.name}</span>
              </label>
              <span class="holiday-meta">{ruleDescription(rule)}</span>
              <span class="holiday-date">{dateLabel(rule)}</span>
              <button class="link-danger" onClick={() => ts.removeHoliday(rule.id)} title="Entfernen">
                ✕
              </button>
            </div>
          )}
        </For>
      </section>

      <section class="add-holiday">
        <h3>Eigenen Feiertag hinzufügen</h3>
        <form onSubmit={addRule}>
          <input
            type="text"
            placeholder="Name"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
          />
          <select value={kind()} onChange={(e) => setKind(e.currentTarget.value as 'fixed' | 'easter')}>
            <option value="fixed">Festes Datum</option>
            <option value="easter">Relativ zu Ostern</option>
          </select>
          <Show
            when={kind() === 'fixed'}
            fallback={
              <label class="inline">
                Ostern ±
                <input
                  type="number"
                  value={offset()}
                  onInput={(e) => setOffset(Number(e.currentTarget.value) || 0)}
                />
                Tage
              </label>
            }
          >
            <label class="inline">
              Tag
              <input
                type="number"
                min="1"
                max="31"
                value={day()}
                onInput={(e) => setDay(Number(e.currentTarget.value) || 1)}
              />
            </label>
            <label class="inline">
              Monat
              <input
                type="number"
                min="1"
                max="12"
                value={month()}
                onInput={(e) => setMonth(Number(e.currentTarget.value) || 1)}
              />
            </label>
          </Show>
          <button type="submit">Hinzufügen</button>
        </form>
      </section>
    </div>
  );
};

export default HolidaysPage;
