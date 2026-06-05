import { Match, Switch, type Component } from 'solid-js';

import { useTimesheet } from '../store/context';

const SaveStatus: Component = () => {
  const ts = useTimesheet();
  return (
    <span
      class="save-status"
      classList={{ saving: ts.saveState() === 'saving', error: ts.saveState() === 'error' }}
      title="Änderungen werden automatisch in die Datei geschrieben"
    >
      <Switch>
        <Match when={ts.saveState() === 'saving'}>● Speichert …</Match>
        <Match when={ts.saveState() === 'error'}>● Speicherfehler</Match>
        <Match when={ts.saveState() === 'saved'}>✓ Gespeichert</Match>
      </Switch>
    </span>
  );
};

export default SaveStatus;
