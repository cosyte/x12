#!/usr/bin/env bash
#
# Build the two release artifacts that cosyte/docs ingests from a GitHub release:
#   docs-content.tar.gz  ->  content/<slug>/      (narrative MDX + sidebars.json [+ versions.json])
#   source.tar.gz        ->  .api-sources/<slug>/  (src/ + package.json + tsconfig.json, for TypeDoc)
#
# Output goes to OUT (default: dist-artifacts/). Run from anywhere; resolves the package root itself.
# The docs repo validates these contracts (intro.md + sidebars.json; src/ + package.json + tsconfig.json),
# so this script fails fast if either is missing.
set -euo pipefail

OUT="${1:-dist-artifacts}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f docs-content/intro.md || ! -f docs-content/sidebars.json ]]; then
  echo "error: docs-content/ must contain intro.md and sidebars.json" >&2
  exit 1
fi
if [[ ! -d src || ! -f package.json || ! -f tsconfig.json ]]; then
  echo "error: source bundle requires src/, package.json, and tsconfig.json at the package root" >&2
  exit 1
fi

mkdir -p "$OUT"

# Narrative bundle: contents of docs-content/ at the tarball root.
tar -czf "$OUT/docs-content.tar.gz" -C docs-content .

# Source bundle: src/ + package.json + tsconfig.json at the tarball root.
tar -czf "$OUT/source.tar.gz" src package.json tsconfig.json

echo "built docs artifacts in $OUT/:"
ls -l "$OUT"
