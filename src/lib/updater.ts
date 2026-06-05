import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';

import { isDesktop } from './fileStore';

/** Update features run only in the packaged production build, never in `tauri dev`. */
export function isProd(): boolean {
  return import.meta.env.PROD && isDesktop();
}

let busy = false;

/**
 * Check GitHub for a newer release. When `interactive` (menu / on-demand) the
 * user is told if they are already up to date; the periodic/launch check is
 * silent unless an update is found. Always prompts before installing.
 */
export async function checkForUpdate(interactive: boolean): Promise<void> {
  if (!isProd() || busy) return;
  busy = true;
  try {
    const update = await check();
    if (!update) {
      if (interactive) await message('Sie verwenden die neueste Version.', { title: 'Habeas Clockus' });
      return;
    }
    const ok = await ask(
      `Version ${update.version} ist verfügbar (installiert: ${update.currentVersion}).\n\nJetzt herunterladen und installieren?`,
      { title: 'Update verfügbar', kind: 'info' },
    );
    if (!ok) return;
    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    if (interactive) {
      await message(`Update-Prüfung fehlgeschlagen:\n${String(e)}`, {
        title: 'Habeas Clockus',
        kind: 'error',
      });
    }
    // Silent on background checks (e.g. offline).
  } finally {
    busy = false;
  }
}
