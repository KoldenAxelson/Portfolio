#!/usr/bin/env bash
#
# setup-ai-tunnel.sh — one-shot setup for the portfolio AI chat feature on the
# wrightfunctions.com zone. Wires the Cloudflare Tunnel route, (re)starts the
# tunnel in the background, deploys the Worker (KV + secret + tunnel var), builds
# and optionally deploys the site, then smoke-tests the whole chain.
#
# Safe to re-run: each step checks current state before acting.
#
# Prereqs (the script verifies these and tells you what's missing):
#   - cloudflared logged in (`cloudflared tunnel login`) with the `ai-tunnel`
#     tunnel already created.
#   - npx / wrangler available; Cloudflare auth working.
#   - AI_PROXY_SECRET exported (same value the Go proxy is running with).
#   - CLOUDFLARE_ACCOUNT_ID exported (skips wrangler's failing /memberships call).
#   - Tunnel hostname: read from ~/.cloudflared/<tunnel>.yml if present, else set
#     AI_TUNNEL_HOST (kept out of the repo — it's not in any committed file).
#   - The Go proxy running on :6573 (`make ai-proxy-run`) and Ollama up.
#
# Usage:
#   export AI_PROXY_SECRET=…           # must match the running proxy
#   export CLOUDFLARE_ACCOUNT_ID=…     # dashboard right sidebar
#   export AI_TUNNEL_HOST=…            # only on first run (before the tunnel
#                                      # config exists); private, never committed
#   ./scripts/setup-ai-tunnel.sh                # tunnel + Worker + build the site
#   DEPLOY_PAGES=1 ./scripts/setup-ai-tunnel.sh # also push the site via wrangler
#                                               # (otherwise deploy via your usual
#                                               #  Pages git integration)
#
set -euo pipefail

# --- config -----------------------------------------------------------------
# ZONE / WORKER_HOST are public (the site domain + the client-facing endpoint).
# The private tunnel hostname is NOT hardcoded here — it's resolved at runtime
# from the local cloudflared config or AI_TUNNEL_HOST (see preflight).
ZONE="wrightfunctions.com"
TUNNEL_NAME="ai-tunnel"
WORKER_HOST="ai.${ZONE}"
SITE_ORIGIN="https://${ZONE}"
PROXY_PORT="6573"   # must match AI_PORT (Makefile) + the proxy default (main.go)
PAGES_PROJECT="portfolio"

CF_DIR="${HOME}/.cloudflared"
CF_YML="${CF_DIR}/${TUNNEL_NAME}.yml"
CF_LOG="${CF_DIR}/${TUNNEL_NAME}.log"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKER_DIR="${REPO_ROOT}/cf-worker"

# --- logging helpers --------------------------------------------------------
if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'; else B=""; G=""; Y=""; R=""; N=""; fi
step() { echo; echo "${B}==> $*${N}"; }
ok()   { echo "${G}  ✓ $*${N}"; }
warn() { echo "${Y}  ! $*${N}"; }
die()  { echo "${R}  ✗ $*${N}" >&2; exit 1; }
auth_hint() {
  cat >&2 <<'HINT'

  Cloudflare rejected the request (auth error 10000). Your API token is missing
  the permissions this deploy needs (the custom domain is managed in the
  dashboard, so only Account-level Workers perms are required here).

  Edit the token (Dashboard → My Profile → API Tokens → edit your token):
    Account · Workers Scripts     : Edit
    Account · Workers KV Storage  : Edit
    Account · Account Settings    : Read
  Then re-export CLOUDFLARE_API_TOKEN and re-run this script.
HINT
}

# --- 0. preflight -----------------------------------------------------------
step "Preflight checks"
command -v cloudflared >/dev/null 2>&1 || die "cloudflared not found"
command -v npx >/dev/null 2>&1         || die "npx (Node) not found"
command -v make >/dev/null 2>&1        || die "make not found"
command -v curl >/dev/null 2>&1        || die "curl not found"
: "${AI_PROXY_SECRET:?Set AI_PROXY_SECRET (same value as the running proxy)}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID (Cloudflare dashboard right sidebar)}"
export CLOUDFLARE_ACCOUNT_ID
ok "tools present; AI_PROXY_SECRET and CLOUDFLARE_ACCOUNT_ID set"

WRANGLER="npx --yes wrangler@4"

# Resolve the tunnel id (from the existing yml, else from `cloudflared tunnel list`).
TUNNEL_ID=""
if [ -f "${CF_YML}" ]; then
  TUNNEL_ID="$(awk -F': *' '/^tunnel:/ {print $2; exit}' "${CF_YML}" | tr -d '[:space:]' || true)"
fi
if [ -z "${TUNNEL_ID}" ]; then
  TUNNEL_ID="$(cloudflared tunnel list 2>/dev/null | awk -v n="${TUNNEL_NAME}" '$2==n {print $1; exit}' || true)"
fi
[ -n "${TUNNEL_ID}" ] || die "Could not find the '${TUNNEL_NAME}' tunnel. Run: cloudflared tunnel create ${TUNNEL_NAME}"
CF_CREDS="${CF_DIR}/${TUNNEL_ID}.json"
[ -f "${CF_CREDS}" ] || die "Tunnel credentials file not found: ${CF_CREDS}"
ok "tunnel '${TUNNEL_NAME}' id=${TUNNEL_ID}"

# Resolve the private tunnel hostname without hardcoding it: prefer AI_TUNNEL_HOST,
# else read the ingress hostname from the existing (untracked) cloudflared config.
TUNNEL_HOST="${AI_TUNNEL_HOST:-}"
if [ -z "${TUNNEL_HOST}" ] && [ -f "${CF_YML}" ]; then
  TUNNEL_HOST="$(awk -F'hostname: *' '/hostname:/ {print $2; exit}' "${CF_YML}" | tr -d '[:space:]' || true)"
fi
[ -n "${TUNNEL_HOST}" ] || die "Set AI_TUNNEL_HOST=<your private tunnel hostname> (it's not stored in the repo)."
ok "tunnel host resolved (private; not echoed)"

# --- 1. proxy reachability --------------------------------------------------
step "Checking the Go proxy on :${PROXY_PORT}"
code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://localhost:${PROXY_PORT}/chat" \
  -H 'Content-Type: application/json' -d '{"message":"ping"}' || echo "000")"
case "${code}" in
  401) ok "proxy is up (401 without the secret header, as expected)" ;;
  000) warn "proxy not responding on :${PROXY_PORT} — start it in another terminal: make ai-proxy-run" ;;
  *)   ok "proxy responded (HTTP ${code})" ;;
esac

# --- 3. tunnel DNS route ----------------------------------------------------
step "Routing ${TUNNEL_HOST} → tunnel ${TUNNEL_NAME}"
cloudflared tunnel route dns "${TUNNEL_NAME}" "${TUNNEL_HOST}" 2>&1 | sed 's/^/    /' || \
  warn "route dns returned non-zero (often means the record already exists — fine)"
ok "DNS route ensured"

# --- 4. (re)write tunnel config and (re)start the tunnel --------------------
step "Writing ${CF_YML} and restarting the tunnel"
cat > "${CF_YML}" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CF_CREDS}
ingress:
  - hostname: ${TUNNEL_HOST}
    service: http://localhost:${PROXY_PORT}
  - service: http_status:404
EOF
ok "config written (ingress → ${TUNNEL_HOST})"

pkill -f "cloudflared tunnel .*run ${TUNNEL_NAME}" 2>/dev/null && sleep 1 || true
nohup cloudflared tunnel --config "${CF_YML}" run "${TUNNEL_NAME}" >"${CF_LOG}" 2>&1 &
sleep 5
if grep -q "Registered tunnel connection" "${CF_LOG}" 2>/dev/null; then
  ok "tunnel running in background (log: ${CF_LOG})"
else
  warn "tunnel may not have registered yet — check ${CF_LOG}"
fi

# --- 5. deploy the Worker ---------------------------------------------------
step "Deploying the Worker (${WORKER_HOST})"
cd "${WORKER_DIR}"

# 5a. Ensure the AI_RL KV namespace exists and its id is in wrangler.toml.
if grep -q "REPLACE_WITH_KV_NAMESPACE_ID" wrangler.toml; then
  echo "    creating/looking up KV namespace AI_RL…"
  create_out="$(${WRANGLER} kv namespace create AI_RL 2>&1 || true)"
  kv_id="$(printf '%s\n' "${create_out}" | grep -oE 'id = "[0-9a-f]{32}"' | head -1 | grep -oE '[0-9a-f]{32}' || true)"
  if [ -z "${kv_id}" ]; then
    # Already exists — find it by title (<worker-name>-<binding>).
    list_json="$(${WRANGLER} kv namespace list 2>/dev/null || echo '[]')"
    kv_id="$(printf '%s' "${list_json}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);const m=a.find(x=>/(^|[-_])AI_RL$/.test(x.title));process.stdout.write(m?m.id:"");}catch{process.stdout.write("");}})')"
  fi
  [ -n "${kv_id}" ] || die "Could not determine the AI_RL KV namespace id. Output was:\n${create_out}"
  tmp="$(mktemp)"; sed "s/REPLACE_WITH_KV_NAMESPACE_ID/${kv_id}/" wrangler.toml > "${tmp}" && mv "${tmp}" wrangler.toml
  ok "KV namespace id ${kv_id} written into wrangler.toml"
else
  ok "KV namespace id already set in wrangler.toml"
fi

# 5b. Deploy with the private tunnel hostname as a var (never committed). The
#     custom domain (${WORKER_HOST}) is managed in the dashboard, not in
#     wrangler.toml, so this only needs Account-level Workers + KV permissions.
echo "    deploying…"
set +e
${WRANGLER} deploy --var "TUNNEL_URL:https://${TUNNEL_HOST}" 2>&1 | sed 's/^/    /'
rc=${PIPESTATUS[0]}
set -e
if [ "${rc}" -ne 0 ]; then auth_hint; die "Worker deploy failed (see above)"; fi
ok "Worker deployed"

# 5c. Set the shared secret (matches the proxy's AI_PROXY_SECRET).
set +e
printf '%s' "${AI_PROXY_SECRET}" | ${WRANGLER} secret put PROXY_SECRET 2>&1 | sed 's/^/    /'
rc=${PIPESTATUS[1]}
set -e
if [ "${rc}" -ne 0 ]; then auth_hint; die "Setting PROXY_SECRET failed (see above)"; fi
ok "PROXY_SECRET set on the Worker"
cd "${REPO_ROOT}"

# --- 6. build (and optionally deploy) the site ------------------------------
step "Building the site"
make css >/dev/null && make build >/dev/null
ok "site built to ./public"
if [ "${DEPLOY_PAGES:-0}" = "1" ]; then
  step "Deploying the site to Cloudflare Pages"
  ${WRANGLER} pages deploy public --project-name="${PAGES_PROJECT}" --commit-dirty=true 2>&1 | sed 's/^/    /' || \
    warn "Pages deploy failed (token may lack Pages perms) — deploy via your Pages git integration."
else
  ok "site built; deploy it via your Pages git integration (or DEPLOY_PAGES=1 to push here)"
fi

# --- 7. smoke test ----------------------------------------------------------
# One request only — extra requests just trip the 5/min edge limit and look like
# a failure. We classify whatever the Worker returns instead of demanding a reply.
step "Smoke testing https://${WORKER_HOST}/chat"
reply="$(curl -s --max-time 25 "https://${WORKER_HOST}/chat" \
  -H 'Content-Type: application/json' -H "Origin: ${SITE_ORIGIN}" \
  -d '{"message":"Who is Konrad?"}' || true)"
case "${reply}" in
  *'"reply"'*)
    ok "end-to-end chain works — model replied:"
    echo "    ${reply}" | cut -c1-300 ;;
  *'"rate_limited"'*)
    ok "chain reachable (rate-limited right now — that's the edge limiter working)."
    echo "    Wait ~60s and try one request to see a real reply." ;;
  *'spike_detected'*)
    ok "chain reachable (circuit breaker open — high traffic; retries on its own)." ;;
  *'model_timeout'*)
    warn "Worker→proxy ok, but the model timed out. Is the model warm? Try once more." ;;
  *'upstream_error'*|*'model_error'*)
    warn "Worker reached, but the proxy/model errored. Check: proxy on :${PROXY_PORT},"
    warn "Ollama running, and the model tag matches (AI_MODEL / 'ollama list')." ;;
  '')
    warn "No response from ${WORKER_HOST}. If you just added the custom domain, give it"
    warn "a minute to provision, then re-run. Otherwise check it's attached in the dashboard." ;;
  *)
    warn "Unexpected response: ${reply}" ;;
esac

# --- 8. tidy up the on-disk secret ------------------------------------------
step "Cleanup"
if [ -f "${HOME}/Desktop/AI_PROXY_SECRET" ]; then
  warn "Found ${HOME}/Desktop/AI_PROXY_SECRET — the secret should only live in env + the Worker."
  printf "    Delete it now? [y/N] "; read -r ans || ans=""
  case "${ans}" in [yY]*) rm -f "${HOME}/Desktop/AI_PROXY_SECRET" && ok "deleted" ;; *) warn "left in place" ;; esac
fi

step "Done"
echo "  Worker:  https://${WORKER_HOST}/chat"
echo "  Tunnel:  ${TUNNEL_HOST}  (log: ${CF_LOG})"
echo "  Widget:  live on every page except /cv once the Pages deploy propagates."
