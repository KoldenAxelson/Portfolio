#!/usr/bin/env bash
# Run Lighthouse against the built site and print the four scores.
#
# This is a manual sanity-check tool, NOT a CI gate. Run it when you want
# to verify you're still hitting the Neofolio targets:
#
#   Performance  ≥ 90
#   Accessibility = 100
#   Best Practices = 100
#   SEO = 100
#
# Usage:
#   bash scripts/lighthouse.sh                   # full report against /
#   bash scripts/lighthouse.sh /projects         # specific path
#   bash scripts/lighthouse.sh / /projects /cv   # multiple paths

set -euo pipefail

PORT="${PORT:-4321}"
PATHS=("${@:-/}")
OUT_DIR=".lighthouse"

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx not found — install Node.js first" >&2
  exit 1
fi

if [[ ! -d dist ]]; then
  echo "→ Building site (no dist/ found)…"
  npm run build
fi

# Serve dist/ in the background. Trap to make sure we kill it.
echo "→ Serving dist/ on http://localhost:${PORT}"
npx --yes http-server dist -p "${PORT}" --silent &
SERVER_PID=$!
trap "kill ${SERVER_PID} >/dev/null 2>&1 || true" EXIT

# Wait for the server to come up.
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:${PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

mkdir -p "${OUT_DIR}"

for path in "${PATHS[@]}"; do
  slug="${path//\//_}"
  slug="${slug:-_root}"
  url="http://localhost:${PORT}${path}"
  # Lighthouse appends `.report.<ext>` to --output-path when multiple
  # --output formats are requested. Match its actual filename emission.
  report="${OUT_DIR}/report${slug}.report.html"
  json="${OUT_DIR}/report${slug}.report.json"

  echo ""
  echo "→ Auditing ${url}"
  npx --yes lighthouse "${url}" \
    --quiet \
    --chrome-flags="--headless=new --no-sandbox" \
    --only-categories=performance,accessibility,best-practices,seo \
    --output=html --output=json \
    --output-path="${OUT_DIR}/report${slug}" >/dev/null

  # Extract scores from the JSON report.
  node -e "
    const r = require('./${json}');
    const cats = r.categories;
    const fmt = (s) => Math.round((s ?? 0) * 100).toString().padStart(3);
    console.log('   Performance:    ' + fmt(cats.performance?.score));
    console.log('   Accessibility:  ' + fmt(cats.accessibility?.score));
    console.log('   Best Practices: ' + fmt(cats['best-practices']?.score));
    console.log('   SEO:            ' + fmt(cats.seo?.score));
  "
  echo "   Report: ${report}"
done

echo ""
echo "Done. Reports in ${OUT_DIR}/"
