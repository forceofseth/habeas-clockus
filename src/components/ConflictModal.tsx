import type { Component } from 'solid-js';

import { useTimesheet } from '../store/context';

const ConflictModal: Component = () => {
  const ts = useTimesheet();
  return (
    <div class="modal-overlay">
      <div class="modal">
        <h2>Datei auf anderem Gerät geändert</h2>
        <p>
          Diese Datei wurde von einem anderen Gerät (z.&nbsp;B. über die Cloud) geändert, während du
          ebenfalls Änderungen gemacht hast. Welche Version soll gelten?
        </p>
        <p class="hint">
          Wählst du «Meine behalten», wird die andere Version vorher als Sicherungskopie neben der
          Datei gespeichert.
        </p>
        <div class="modal-actions">
          <button onClick={() => void ts.resolveConflict('theirs')}>Andere Version laden</button>
          <button class="primary" onClick={() => void ts.resolveConflict('mine')}>
            Meine behalten
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;
