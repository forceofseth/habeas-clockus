import {
  ErrorBoundary,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from 'solid-js';

import { listen } from '@tauri-apps/api/event';

import AbsenceWizard from './components/AbsenceWizard';
import Header from './components/Header';
import HolidaysPage from './components/HolidaysPage';
import LoadingOverlay from './components/LoadingOverlay';
import MonthView from './components/MonthView';
import TotalsBar from './components/TotalsBar';
import WeekView from './components/WeekView';
import WelcomeScreen from './components/WelcomeScreen';
import {
  addDays,
  addMonths,
  formatMonthTitle,
  formatWeekTitle,
  monthRange,
  todayKey,
  weekRange,
  yearOf,
} from './lib/date';
import {
  getRememberedFile,
  isDesktop,
  makeBackend,
  pickOpenFile,
  pickSaveFile,
  readFile,
  setRememberedFile,
  writeFile,
} from './lib/fileStore';
import { fetchHolidayNames, resolveRules } from './lib/holidays';
import { loadLocal, normalizeDoc } from './lib/storage';
import { checkForUpdate, isProd } from './lib/updater';
import { defaultDoc } from './model/defaults';
import type { TimesheetDoc } from './model/types';
import { TimesheetProvider, useTimesheet } from './store/context';

interface Ready {
  doc: TimesheetDoc;
  path: string | null;
}

type Phase = { kind: 'loading' } | { kind: 'welcome'; error?: string } | { kind: 'ready'; data: Ready };

// ── The tracker UI (rendered once a document is loaded) ───────────────────────

const Main: Component<{
  filePath: string | null;
  desktop: boolean;
  onOpenFile: () => void;
  onCreateFile: () => void;
}> = (props) => {
  const ts = useTimesheet();
  const today = todayKey();

  const [loading, setLoading] = createSignal(false);
  const [page, setPage] = createSignal<'tracker' | 'holidays'>('tracker');
  const [view, setView] = createSignal<'week' | 'month'>('week');
  const [anchor, setAnchor] = createSignal<string>(today);
  const [absenceOpen, setAbsenceOpen] = createSignal(false);

  const currentYear = yearOf(today);
  const inFlight = new Set<number>();

  // Ensure a year's holidays are fetched + cached into the document. Working-day
  // logic already computes them from the rules, so this only enriches names and
  // persists them; the spinner is only shown for the initial current-year load.
  async function ensureYear(year: number, withSpinner: boolean) {
    if (ts.doc.holidayCache[year]?.length || inFlight.has(year)) return;
    inFlight.add(year);
    if (withSpinner) setLoading(true);
    try {
      const names = await fetchHolidayNames(year);
      const resolved = resolveRules(ts.doc.holidayConfig, year);
      const holidays = names
        ? resolved.map((h) => ({ ...h, name: names.get(h.date) ?? h.name }))
        : resolved;
      ts.setHolidayCacheYear(year, holidays, names ? 'online' : 'computed');
    } finally {
      if (withSpinner) setLoading(false);
      inFlight.delete(year);
    }
  }

  // Initial: current year, with the full-app spinner.
  onMount(() => void ensureYear(currentYear, true));
  // Whenever you navigate into a different year, fetch + cache it in the
  // background (holidays already render from the rules meanwhile).
  createEffect(() => {
    const y = yearOf(anchor());
    if (y !== currentYear) void ensureYear(y, false);
  });

  // On focus, refresh holidays for the current calendar year in case the app was
  // left open across midnight into a new year.
  const onFocus = () => {
    void ensureYear(yearOf(todayKey()), false); // new calendar year if left open
  };
  const onVisible = () => {
    if (!document.hidden) onFocus();
  };
  onMount(() => {
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
  });
  onCleanup(() => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisible);
  });

  const range = createMemo(() => (view() === 'week' ? weekRange(anchor()) : monthRange(anchor())));
  const title = createMemo(() =>
    view() === 'week' ? formatWeekTitle(anchor()) : formatMonthTitle(anchor()),
  );
  const step = (dir: -1 | 1) =>
    setAnchor((a) => (view() === 'week' ? addDays(a, dir * 7) : addMonths(a, dir)));

  return (
    <div class="app">
      <Show when={loading()}>
        <LoadingOverlay />
      </Show>

      <Show when={absenceOpen()}>
        <AbsenceWizard onClose={() => setAbsenceOpen(false)} />
      </Show>

      <Show
        when={page() === 'tracker'}
        fallback={
          <HolidaysPage
            onClose={() => setPage('tracker')}
            desktop={props.desktop}
            filePath={props.filePath}
            onOpenFile={props.onOpenFile}
            onCreateFile={props.onCreateFile}
          />
        }
      >
        <Header
          view={view()}
          title={title()}
          onSetView={setView}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToday={() => setAnchor(today)}
          onOpenHolidays={() => setPage('holidays')}
          onOpenAbsence={() => setAbsenceOpen(true)}
        />
        <TotalsBar range={range()} today={today} view={view()} year={yearOf(anchor())} />
        <main class="content">
          <Show when={view() === 'week'} fallback={<MonthView anchor={anchor()} today={today} />}>
            <WeekView anchor={anchor()} today={today} />
          </Show>
        </main>
      </Show>
    </div>
  );
};

const ReadyApp: Component<{
  data: Ready;
  desktop: boolean;
  onOpenFile: () => void;
  onCreateFile: () => void;
}> = (props) => {
  const backend = makeBackend(props.data.path);
  return (
    <TimesheetProvider initialDoc={props.data.doc} backend={backend}>
      <Main
        filePath={props.data.path}
        desktop={props.desktop}
        onOpenFile={props.onOpenFile}
        onCreateFile={props.onCreateFile}
      />
    </TimesheetProvider>
  );
};

// ── Root: decides where the data lives before showing the tracker ─────────────

const App: Component = () => {
  const desktop = isDesktop();
  const [phase, setPhase] = createSignal<Phase>({ kind: 'loading' });

  const ready = () => {
    const p = phase();
    return p.kind === 'ready' ? p.data : null;
  };
  const welcomeError = () => {
    const p = phase();
    return p.kind === 'welcome' ? p.error : undefined;
  };

  // Auto-update: production build only. Check shortly after launch, every 6h,
  // and on demand from the native menu. Never runs in `tauri dev`.
  onMount(() => {
    if (!isProd()) return;
    const t = setTimeout(() => void checkForUpdate(false), 3000);
    const iv = setInterval(() => void checkForUpdate(false), 6 * 60 * 60 * 1000);
    let unlisten: (() => void) | undefined;
    void listen('menu:check-update', () => void checkForUpdate(true)).then((u) => (unlisten = u));
    onCleanup(() => {
      clearTimeout(t);
      clearInterval(iv);
      unlisten?.();
    });
  });

  onMount(async () => {
    if (!desktop) {
      // Plain-browser dev mode: persist to localStorage, no file picker.
      setPhase({ kind: 'ready', data: { doc: loadLocal(), path: null } });
      return;
    }
    try {
      const path = await getRememberedFile();
      if (!path) {
        setPhase({ kind: 'welcome' });
        return;
      }
      const text = await readFile(path);
      setPhase({ kind: 'ready', data: { doc: normalizeDoc(JSON.parse(text)), path } });
    } catch {
      setPhase({ kind: 'welcome', error: 'Die zuletzt verwendete Datei konnte nicht geladen werden.' });
    }
  });

  async function createNew() {
    const path = await pickSaveFile();
    if (!path) return;
    const doc = defaultDoc();
    await writeFile(path, JSON.stringify(doc, null, 2));
    await setRememberedFile(path);
    setPhase({ kind: 'ready', data: { doc, path } });
  }

  async function openExisting() {
    const path = await pickOpenFile();
    if (!path) return;
    try {
      const text = await readFile(path);
      const doc = normalizeDoc(JSON.parse(text));
      await setRememberedFile(path);
      setPhase({ kind: 'ready', data: { doc, path } });
    } catch {
      setPhase({ kind: 'welcome', error: 'Datei konnte nicht gelesen werden.' });
    }
  }

  return (
    <ErrorBoundary
      fallback={(err) => (
        <div class="welcome">
          <div class="welcome-card">
            <h1>Ein Fehler ist aufgetreten</h1>
            <p class="welcome-error">{String(err?.message ?? err)}</p>
            <div class="welcome-actions">
              <button class="primary" onClick={() => location.reload()}>
                Neu laden
              </button>
            </div>
          </div>
        </div>
      )}
    >
      <Show when={import.meta.env.DEV}>
        <div class="dev-banner">DEV BUILD</div>
      </Show>
      <Switch>
        <Match when={phase().kind === 'loading'}>
        <div class="app">
          <LoadingOverlay message="Lädt …" />
        </div>
      </Match>
      <Match when={phase().kind === 'welcome'}>
        <WelcomeScreen onCreate={createNew} onOpen={openExisting} error={welcomeError()} />
      </Match>
      <Match when={phase().kind === 'ready'}>
        <Show when={ready()} keyed>
          {(data) => (
            <ReadyApp
              data={data}
              desktop={desktop}
              onOpenFile={openExisting}
              onCreateFile={createNew}
            />
          )}
        </Show>
      </Match>
      </Switch>
    </ErrorBoundary>
  );
};

export default App;
