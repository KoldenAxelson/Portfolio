#!/usr/bin/env bash
# Neofolio — idempotent local setup.
#
# Safe to run multiple times. Each step checks before acting.
#
# What this script does:
#   1. Verify Node ≥ 18.17
#   2. Install npm dependencies (only if package-lock or node_modules is stale)
#   3. Copy .env.example → .env (if .env doesn't exist)
#   4. Make scripts/*.sh executable
#   5. Run `npm run build` once to confirm everything compiles
#
# What this script does NOT do — see HUMAN.md:
#   - Anything requiring browser sign-in (Cloudflare dashboard, GitHub Pages config)
#   - Anything requiring credentials you haven't given us (gh auth, wrangler login)
#   - Picking your domain name, your colors, your project list

set -euo pipefail

cd "$(dirname "$0")"

# ---------------------------------------------------------------------------
# Pretty output
# ---------------------------------------------------------------------------
say() { printf '\033[1;36m→\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m!\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Node version check
# ---------------------------------------------------------------------------
say "Checking Node.js version…"
if ! command -v node >/dev/null 2>&1; then
  die "node is not installed. Get it from https://nodejs.org/ (≥ 18.17)."
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
NODE_MINOR=$(node -p 'process.versions.node.split(".")[1]')
if [[ "${NODE_MAJOR}" -lt 18 ]] || { [[ "${NODE_MAJOR}" -eq 18 ]] && [[ "${NODE_MINOR}" -lt 17 ]]; }; then
  die "Node ${NODE_MAJOR}.${NODE_MINOR} found. Need ≥ 18.17."
fi
ok "Node $(node --version)"

# ---------------------------------------------------------------------------
# 2. Install dependencies (idempotent)
# ---------------------------------------------------------------------------
say "Installing npm dependencies…"
if [[ -d node_modules ]] && [[ -f package-lock.json ]] && [[ node_modules -nt package-lock.json ]]; then
  ok "node_modules is up to date — skipping install"
else
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  ok "Dependencies installed"
fi

# ---------------------------------------------------------------------------
# 3. .env scaffold
# ---------------------------------------------------------------------------
say "Setting up .env…"
if [[ -f .env ]]; then
  ok ".env already exists — leaving it alone"
else
  cp .env.example .env
  ok "Created .env from .env.example (edit it before deploying)"
fi

# ---------------------------------------------------------------------------
# 4. Make scripts executable
# ---------------------------------------------------------------------------
say "Marking scripts as executable…"
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x setup.sh
ok "Scripts ready"

# ---------------------------------------------------------------------------
# 5. Smoke build
# ---------------------------------------------------------------------------
say "Running a smoke build to catch config issues early…"
if npm run build >/tmp/neofolio-build.log 2>&1; then
  ok "Build succeeded — see dist/"
else
  warn "Build failed. Tail of /tmp/neofolio-build.log:"
  tail -n 30 /tmp/neofolio-build.log
  die "Fix the errors above, then re-run setup.sh."
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
cat <<EOF

$(ok "Neofolio is ready.")

Next steps:
  $ npm run dev        # local dev server on :4321
  $ npm run lighthouse # audit your scores

Things only you can do — see HUMAN.md:
  · Pick a domain
  · Edit src/config.ts with your name, bio, links
  · Add real OG image (public/og-default.png)
  · Connect the repo to GitHub Pages or Cloudflare Pages
  · Set Workers secrets for the contact form

EOF
