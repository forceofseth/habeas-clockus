import { Show, type Component } from 'solid-js';

import Logo from './Logo';

const WelcomeScreen: Component<{
  onCreate: () => void;
  onOpen: () => void;
  error?: string;
}> = (props) => (
  <div class="welcome">
    <div class="welcome-card">
      <div class="welcome-brand">
        <Logo size={48} />
        <h1>Habeas Clockus</h1>
      </div>
      <p class="welcome-lead">
        Wähle, wo deine Arbeitszeit gespeichert wird. Die Daten werden in einer JSON-Datei
        abgelegt – lege sie z.&nbsp;B. in deinen Dropbox-Ordner, damit sie gesichert und
        synchronisiert wird. Jede Änderung wird sofort in diese Datei geschrieben.
      </p>

      <Show when={props.error}>
        <p class="welcome-error">{props.error}</p>
      </Show>

      <div class="welcome-actions">
        <button class="primary" onClick={props.onCreate}>
          Neue Datei erstellen
        </button>
        <button onClick={props.onOpen}>Bestehende Datei öffnen</button>
      </div>
    </div>
  </div>
);

export default WelcomeScreen;
