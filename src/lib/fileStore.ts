import { invoke, isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

import { STORAGE_KEY } from '../model/defaults';

/** True when running inside the Tauri desktop shell (vs a plain browser tab). */
export function isDesktop(): boolean {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

// ── Remembered file path (stored in the app config dir by Rust) ───────────────

export async function getRememberedFile(): Promise<string | null> {
  return (await invoke<string | null>('get_remembered_file')) ?? null;
}

export async function setRememberedFile(path: string): Promise<void> {
  await invoke('set_remembered_file', { path });
}

// ── Raw file IO (via Rust commands; any path the user picked) ──────────────────

export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

export async function writeFile(path: string, contents: string): Promise<void> {
  await invoke('write_file', { path, contents });
}

// ── Native file pickers ───────────────────────────────────────────────────────

export async function pickSaveFile(): Promise<string | null> {
  const path = await save({
    title: 'Neue Zeiterfassungs-Datei erstellen',
    defaultPath: 'habeas-clockus.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  return path ?? null;
}

export async function pickOpenFile(): Promise<string | null> {
  const res = await open({
    title: 'Zeiterfassungs-Datei öffnen',
    multiple: false,
    directory: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  return typeof res === 'string' ? res : null;
}

// ── Backend (read / write / backup) ───────────────────────────────────────────

export interface FileBackend {
  /** Current on-disk content, or null if missing/unreadable. */
  read: () => Promise<string | null>;
  write: (json: string) => Promise<void>;
  /** Write a timestamped backup copy (used before overwriting a conflict). */
  backup: (json: string) => Promise<void>;
}

function timestamp(): string {
  // Date is available in the webview (not a Workflow script); fine to use here.
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function backupPath(path: string): string {
  const base = path.replace(/\.json$/i, '');
  return `${base}.conflict-${timestamp()}.json`;
}

/**
 * Build the persistence backend for the active target. On desktop it reads/
 * writes the bound file; in a plain browser (dev) it falls back to localStorage.
 */
export function makeBackend(path: string | null): FileBackend {
  if (path) {
    return {
      read: async () => {
        try {
          return await readFile(path);
        } catch {
          return null;
        }
      },
      write: (json) => writeFile(path, json),
      backup: (json) => writeFile(backupPath(path), json),
    };
  }
  return {
    read: async () => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    },
    write: async (json) => {
      try {
        localStorage.setItem(STORAGE_KEY, json);
      } catch {
        /* storage unavailable */
      }
    },
    backup: async (json) => {
      try {
        localStorage.setItem(`${STORAGE_KEY}:conflict-${timestamp()}`, json);
      } catch {
        /* storage unavailable */
      }
    },
  };
}
