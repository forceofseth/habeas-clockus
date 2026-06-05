import type { Component } from 'solid-js';

import Logo from './Logo';
import SaveStatus from './SaveStatus';

const Header: Component<{
  view: 'week' | 'month';
  title: string;
  onSetView: (v: 'week' | 'month') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenHolidays: () => void;
  onOpenAbsence: () => void;
}> = (props) => {
  return (
    <header class="app-header">
      <div class="brand">
        <Logo size={32} />
        <h1>Habeas Clockus</h1>
      </div>

      <div class="toolbar">
        <div class="segmented">
          <button classList={{ active: props.view === 'week' }} onClick={() => props.onSetView('week')}>
            Woche
          </button>
          <button classList={{ active: props.view === 'month' }} onClick={() => props.onSetView('month')}>
            Monat
          </button>
        </div>

        <div class="nav">
          <button onClick={props.onPrev} aria-label="Zurück">
            ◀
          </button>
          <span class="nav-title">{props.title}</span>
          <button onClick={props.onNext} aria-label="Weiter">
            ▶
          </button>
          <button class="today-btn" onClick={props.onToday}>
            {props.view === 'week' ? 'Heute' : 'Aktueller Monat'}
          </button>
        </div>

        <div class="actions">
          <button onClick={props.onOpenAbsence}>Abwesenheit</button>
          <button onClick={props.onOpenHolidays}>Einstellungen</button>
          <SaveStatus />
        </div>
      </div>
    </header>
  );
};

export default Header;
