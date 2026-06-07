# Habeas Clockus

A small, **local** work-hours tracker (Gleitzeit / flextime) for a single employee. It keeps a
running flex-time balance, tracks remaining vacation, and understands Swiss public holidays — with
defaults tuned for **Bülach, Canton Zürich**.

It's a native **macOS** desktop app (Tauri + SolidJS). All data lives in a plain JSON file on your
own machine — no account, no server, no cloud.

## Download

Grab the latest signed build from the download page:

**→ https://forceofseth.github.io/habeas-clockus/**

(or directly from the [GitHub Releases](https://github.com/forceofseth/habeas-clockus/releases/latest).)

Requires a Mac with **Apple Silicon** (M-series). Once installed, the app updates itself
automatically from new releases.

### First launch

The app is ad-hoc-signed but not Apple-notarized, so macOS quarantines a freshly downloaded copy.
After dragging it to `/Applications`, if macOS reports it as "damaged" or blocks it, clear the
quarantine flag once:

```bash
xattr -dr com.apple.quarantine "/Applications/Habeas Clockus.app"
```

(or System Settings → Privacy & Security → "Open anyway").

## What it does

- **Week & month views** — log each day as one or more From–To spans, minus breaks.
- **Gleitzeit balance** — a running +/− flex-time saldo. A day counts the moment you enter time
  (`worked − target`); an empty past working day counts as a shortfall once it's over.
- **Day types** — normal *work*, *absence* (Ferien / Krank, neutral — never owes hours), and
  *compensation* (time-in-lieu, drawn from the overtime saldo). An absence wizard fills whole spans.
- **Vacation tracking** — annual entitlement (default 25 days) with an opening balance per start year.
- **Swiss holidays** — the full nationwide + cantonal set is seeded; the days observed in
  Bülach / Zürich are enabled by default, and the rest can be switched on from the Holidays page.
  Easter-relative holidays are computed; names can be enriched online.
- **Configurable** — weekly hours (default 42), work days per week (5), target per workday (8.4),
  employment start date, and carried-over balances.

Defaults reflect a 42 h / 5-day week in Canton Zürich, but everything is adjustable in Settings.

## Development

Prerequisites: Node.js and the [Rust toolchain](https://www.rust-lang.org/tools/install) (for Tauri).

```bash
npm install
npm run tauri:dev      # run the desktop app with hot reload
```

You can also run just the web frontend in a browser (uses localStorage instead of a file):

```bash
npm run dev            # http://localhost:3000
```

### Build

```bash
npm run tauri:build    # produces the .app, .dmg and signed updater artifacts
```

### Tests

```bash
npm test               # unit tests (Vitest, watch)
npm run test:run       # unit tests, single run
npm run test:e2e       # end-to-end tests (Playwright)
```

## Project layout

```
src/
  components/   SolidJS UI (week/month views, day rows, wizards, settings)
  lib/          core logic — balance, hours, holidays, dates, file & storage IO, updater
  model/        types and defaults (settings, holiday rules)
  store/        timesheet store + context
src-tauri/      Rust shell (file IO commands, window, updater)
docs/           the GitHub Pages download site
```

## Releasing

See [RELEASING.md](./RELEASING.md) — `scripts/release.sh <version>` builds, signs, and publishes a
GitHub release, and the download page always points at the newest one.

## License

MIT
