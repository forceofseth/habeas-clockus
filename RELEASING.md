# Releasing Habeas Clockus

The app auto-updates from **GitHub Releases** of `forceofseth/habeas-clockus`.
Each release is built and signed **locally** on an Apple-Silicon Mac, then published.

## One-time setup

1. **Signing key** (already generated at `~/.tauri/habeas-clockus.key`, passwordless).
   - The matching **public key** is in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.
   - **Back up `~/.tauri/habeas-clockus.key`** somewhere safe. If lost, you can no longer ship
     updates that installed apps will accept. Never commit it (`.gitignore` already blocks it).
2. **GitHub CLI**: `gh auth login` (needs `repo` scope to create releases).

## Cut a release

```bash
scripts/release.sh 0.1.1        # the new version
```

This will:
1. Set the version in `tauri.conf.json` + `package.json`.
2. `tauri build` (signed via the env key) → produces the `.app`, the updater
   `*_aarch64.app.tar.gz` + `.sig`, and a `.dmg`.
3. Generate the public **`latest.json`** (version + signature + download URL only — **no user
   data**).
4. `gh release create v0.1.1` with `latest.json`, the `.tar.gz` (+ `.sig`) and the `.dmg`,
   marked as the **latest** release.

Then commit the version bump:

```bash
git commit -am "v0.1.1" && git tag v0.1.1 && git push && git push --tags
```

## How updates reach users

- Installed apps poll `https://github.com/forceofseth/habeas-clockus/releases/latest/download/latest.json`
  on launch, every 6 h, and via **menu → "Nach Updates suchen…"** (production builds only).
- A newer `version` → the app prompts, downloads, verifies the signature against the embedded
  public key, installs, and relaunches.

## Versioning

`src-tauri/tauri.conf.json` `version` is the **single source of truth** (semver). Bump it for every
release; `release.sh` keeps `package.json` in sync.

## Caveat — ad-hoc signed, not Apple-notarized

The build is **ad-hoc signed** (`bundle.macOS.signingIdentity = "-"`) but **not Apple-notarized**
(no Apple Developer account). So a freshly **downloaded** copy is quarantined and macOS shows
"beschädigt"/blocked on first open. Clear it once per machine:

```bash
xattr -dr com.apple.quarantine "/Applications/Habeas Clockus.app"
```

(or Systemeinstellungen → Datenschutz & Sicherheit → "Trotzdem öffnen"). The GitHub release notes
include this instruction automatically. To remove the prompt entirely you'd add Apple code signing +
notarization (~$99/yr Apple Developer account).
