#!/usr/bin/env bash
# seal — the interactive front end behind `make seal`. Pick what to seal, give
# it a PIN, and it writes the ciphertext under static/vault/ with
# scripts/vault/vault-seal.go (see that file for the format and its honesty note).
#
#   make seal                                   # menu, then PIN prompt
#   SEAL_TARGET=drafts VAULT_CODE=5555 make seal  # non-interactive (name or number)
#
# Targets:
#   Drafts — every article in review plus the /misc/drafts list. Builds the site
#            privately with HUGO_PARAMS_SEALSOURCE=true (so the pages render
#            their real content), then seals each built page whole. Sealed
#            pages point at the site's fingerprinted scripts, so re-seal after
#            changing a draft *or* the site's code. Seals of drafts that have
#            been published are deleted.
#   GrowGo — the investor pitch, from $GROWGO_SOURCE.
#   Brine  — the brine mining pitch (/misc/brine-mining/). Its source lives in
#            private/brine-mining/ (gitignored), laid out like the site:
#            content/misc/brine-mining.md, data/brine-mining.yaml,
#            data/ml/references/brine-mining.yaml. Copies the site to a temp
#            folder, lays those files over it, builds it unsealed and seals
#            the page. The repo itself is never touched, and the plaintext
#            never leaves the temp folder. Re-seal after editing the pitch
#            *or* the site's code (the sealed page links the site's scripts).
#
# Adding a target: a seal_<name> function below plus an entry in TARGETS.
set -euo pipefail

HUGO=${HUGO:-bin/hugo}
TAILWIND=${TAILWIND:-bin/tailwindcss}
GROWGO_SOURCE=${GROWGO_SOURCE:-../GrowGo/pitch/web/index.html}
TARGETS=(Drafts GrowGo Brine)
BRINE_SOURCE=${BRINE_SOURCE:-private/brine-mining}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

fail() { echo "seal: $*" >&2; exit 1; }

pick_target() {
  local choice=${SEAL_TARGET:-}
  if [ -z "$choice" ]; then
    echo "Make a Choice..."
    local menu="" i
    for i in "${!TARGETS[@]}"; do
      menu+="${menu:+ | }$((i + 1)) ${TARGETS[$i]}"
    done
    echo "$menu"
    read -r -p "Input: " choice
  fi
  for i in "${!TARGETS[@]}"; do
    local name=${TARGETS[$i]}
    if [ "$choice" = "$((i + 1))" ] || [ "$(echo "$choice" | tr '[:upper:]' '[:lower:]')" = "$(echo "$name" | tr '[:upper:]' '[:lower:]')" ]; then
      target=$name
      return
    fi
  done
  fail "no target \"$choice\" (choose 1–${#TARGETS[@]})"
}

read_pin() {
  pin=${VAULT_CODE:-}
  while [[ ! $pin =~ ^[0-9]{4,}$ ]]; do
    [ -n "${VAULT_CODE:-}" ] && fail "VAULT_CODE must be 4 or more digits"
    echo "Make a 4-Digit Pin"
    read -r -p "Input: " pin
    [[ $pin =~ ^[0-9]{4,}$ ]] || echo "Digits only, at least 4."
  done
}

seal_file() { # <plaintext html> <vault name>
  "$work/vault-seal" -in "$1" -out "static/vault/$2.json" -code "$pin" >/dev/null
}

seal_growgo() {
  [ -f "$GROWGO_SOURCE" ] || fail "GrowGo source not found: $GROWGO_SOURCE (set VAULT_IN=path/to/page.html)"
  seal_file "$GROWGO_SOURCE" growgo
  summary="static/vault/growgo.json"
}

seal_drafts() {
  local slugs=() file slug
  for file in content/articles/*.md; do
    grep -q '^review: true' "$file" && slugs+=("$(basename "$file" .md)")
  done

  echo "Building the drafts privately…"
  "$TAILWIND" -i assets/css/main.css -o assets/css/app.css --minify >/dev/null 2>&1
  HUGO_PARAMS_SEALSOURCE=true "$HUGO" --minify --quiet -d "$work/site" >/dev/null

  mkdir -p static/vault/drafts
  seal_file "$work/site/misc/drafts/index.html" drafts
  # ${slugs[@]+…}: macOS ships bash 3.2, where an empty array trips `set -u`.
  for slug in ${slugs[@]+"${slugs[@]}"}; do
    seal_file "$work/site/articles/$slug/index.html" "drafts/$slug"
  done

  local stale=0
  for file in static/vault/drafts/*.json; do
    [ -e "$file" ] || continue
    slug=$(basename "$file" .json)
    if [[ ! " ${slugs[*]-} " == *" $slug "* ]]; then
      rm "$file"
      stale=$((stale + 1))
    fi
  done
  summary="${#slugs[@]} drafts + the list → static/vault/drafts/"
  [ "$stale" -gt 0 ] && summary+=" (removed $stale published)"
  summary+=$'\n'"Re-seal after changing a draft or the site's scripts."
}

seal_brine() {
  [ -f "$BRINE_SOURCE/content/misc/brine-mining.md" ] || fail "brine pitch source not found: $BRINE_SOURCE/content/misc/brine-mining.md"
  local root tree hugo tailwind
  root=$(pwd)
  tree="$work/tree"
  # Absolute paths: the build below runs from the temp copy.
  case $HUGO in /*) hugo=$HUGO ;; *) hugo="$root/$HUGO" ;; esac
  case $TAILWIND in /*) tailwind=$TAILWIND ;; *) tailwind="$root/$TAILWIND" ;; esac

  echo "Building the pitch privately…"
  mkdir -p "$tree"
  # The site minus build output, toolchain and private notes; then the pitch on top.
  tar -cf - --exclude=./public --exclude=./resources --exclude=./bin --exclude=./private \
    --exclude=./.git --exclude=./static/downloads . | tar -xf - -C "$tree"
  cp -R "$BRINE_SOURCE"/. "$tree"/
  (cd "$tree" && "$tailwind" -i assets/css/main.css -o assets/css/app.css --minify >/dev/null 2>&1)
  HUGO_PARAMS_SEALSOURCE=true "$hugo" -s "$tree" --minify --quiet -d "$work/site" >/dev/null

  seal_file "$work/site/misc/brine-mining/index.html" brine-mining
  summary="static/vault/brine-mining.json"$'\n'"Re-seal after editing the pitch or the site's scripts."
}

command -v go >/dev/null 2>&1 || fail "Go not found on PATH — install from https://go.dev/dl/"
pick_target
read_pin
go build -o "$work/vault-seal" scripts/vault/vault-seal.go

summary=""
case $target in
  Drafts) seal_drafts ;;
  GrowGo) seal_growgo ;;
  Brine) seal_brine ;;
esac

echo "$target has been sealed with code: $pin"
echo "$summary"
echo "Rebuild (make build / make dev) and commit static/vault/."
