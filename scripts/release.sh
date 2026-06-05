#!/usr/bin/env bash
#
# Build, sign and publish a Habeas Clockus release to GitHub.
#
#   scripts/release.sh 0.1.1
#
# Requirements:
#   - gh CLI authenticated (`gh auth login`)
#   - updater signing key at ~/.tauri/habeas-clockus.key (passwordless),
#     or set TAURI_SIGNING_PRIVATE_KEY_PASSWORD yourself.
#
set -euo pipefail

VERSION="${1:?Usage: scripts/release.sh <version>  e.g. 0.1.1}"
VERSION="${VERSION#v}"
TAG="v${VERSION}"
REPO="forceofseth/habeas-clockus"
ASSET="habeas-clockus-aarch64.app.tar.gz"
# Stable URL that always points at the newest release's asset:
URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# --- signing key ---
KEY="${HOME}/.tauri/habeas-clockus.key"
[ -f "$KEY" ] || { echo "✗ Signing key not found at $KEY"; exit 1; }
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}"

# --- bump version in tauri.conf.json + package.json ---
node -e "for (const f of ['src-tauri/tauri.conf.json','package.json']){const j=require('./'+f);j.version='${VERSION}';require('fs').writeFileSync(f, JSON.stringify(j,null,2)+'\n');}"
echo "→ version set to ${VERSION}"

echo "→ building (arm64)…"
npm run tauri build

BUNDLE="src-tauri/target/release/bundle"
TARGZ="$(ls "$BUNDLE"/macos/*.app.tar.gz 2>/dev/null | head -1 || true)"
SIG="$(ls "$BUNDLE"/macos/*.app.tar.gz.sig 2>/dev/null | head -1 || true)"
DMG="$(ls "$BUNDLE"/dmg/*.dmg 2>/dev/null | head -1 || true)"
[ -n "$TARGZ" ] && [ -n "$SIG" ] || { echo "✗ Updater artifacts missing (createUpdaterArtifacts + signing env?)"; exit 1; }

OUT="$(mktemp -d)"
cp "$TARGZ" "$OUT/$ASSET"
cp "$SIG"   "$OUT/$ASSET.sig"
[ -n "$DMG" ] && cp "$DMG" "$OUT/Habeas-Clockus-${TAG}-aarch64.dmg"

# --- latest.json (public update manifest: version + signature + url only) ---
SIGNATURE="$(cat "$SIG")"
SIGNATURE="$SIGNATURE" VERSION="$VERSION" TAG="$TAG" URL="$URL" OUT="$OUT" node -e '
const fs = require("fs");
const data = {
  version: process.env.VERSION,
  notes: "Habeas Clockus " + process.env.TAG,
  pub_date: new Date().toISOString(),
  platforms: { "darwin-aarch64": { signature: process.env.SIGNATURE, url: process.env.URL } },
};
fs.writeFileSync(process.env.OUT + "/latest.json", JSON.stringify(data, null, 2));
'
echo "→ latest.json written"

# --- publish ---
ASSETS=("$OUT/$ASSET" "$OUT/$ASSET.sig" "$OUT/latest.json")
[ -n "$DMG" ] && ASSETS+=("$OUT/Habeas-Clockus-${TAG}-aarch64.dmg")

NOTES="Habeas Clockus ${TAG}

Erstinstallation (App ist ad-hoc-signiert, nicht Apple-notarisiert):
1. DMG öffnen, App nach /Programme ziehen.
2. Falls macOS \"beschädigt\" / blockiert meldet, einmalig im Terminal:
     xattr -dr com.apple.quarantine \"/Applications/Habeas Clockus.app\"
   (oder Systemeinstellungen → Datenschutz & Sicherheit → \"Trotzdem öffnen\")."

echo "→ creating GitHub release ${TAG}…"
gh release create "$TAG" "${ASSETS[@]}" --repo "$REPO" --title "$TAG" --notes "$NOTES"

echo "✓ Released ${TAG}. Commit the version bump:  git commit -am '${TAG}' && git tag ${TAG} && git push --tags"
