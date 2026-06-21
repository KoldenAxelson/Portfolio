# AI Tunnel — operations & domain-migration notes

The "Ask about Konrad" chat widget is backed by a local Ollama instance exposed
through a Cloudflare Tunnel and guarded by a Cloudflare Worker. Full design:
`SPEC-ai-agent.md`. This doc covers what's deployed today and exactly what to
change to move the feature from **wrightfunctions.com** to **konradwright.com**
later.

The widget shows on every page **except `/cv` and `/misc/*`**, and only when a
backend health check passes (see *Health gate* below). Each question also carries
the current page (title/URL/description) so the agent can answer "what is this
page about?".

## Current state (wrightfunctions.com)

The feature runs entirely on the `wrightfunctions.com` Cloudflare zone — the
live site's zone. `konradwright.com` is **not** a zone on the Cloudflare account
yet, which is why the initial setup pointed here instead.

| Piece            | Value                                   |
| ---------------- | --------------------------------------- |
| Site baseURL     | `https://wrightfunctions.com/`          |
| Worker host      | `ai.wrightfunctions.com`                |
| Tunnel hostname  | _private_ — set as the Worker `TUNNEL_URL` var / `~/.cloudflared`; never committed |
| Browser endpoints| `POST /chat`, `GET /health` on `https://ai.wrightfunctions.com` (chat URL is Hugo param `aiChatURL`; the widget derives `/health` from it) |
| Proxy port       | `:6573` (localhost only). Must match `AI_PORT` (Makefile), the proxy default (`ai-proxy/main.go`), `PROXY_PORT` (setup script), and the tunnel ingress |
| Model            | `llama3.2:3b`. `make ai-proxy-run` auto-detects the installed model; override with `AI_MODEL=…` |
| CORS allowlist   | `wrightfunctions.com`, `www.wrightfunctions.com` |

### Components

- **`CONTEXT.md`** — hand-maintained agent knowledge (leads with the site + stack,
  then Konrad). The proxy reads it at startup; **restart the proxy after edits**.
- **`ai-proxy/main.go`** — Go proxy in front of Ollama. Build/run/stop with
  `make ai-proxy` / `make ai-proxy-run` / `make ai-proxy-stop` (reads
  `AI_PROXY_SECRET`, optionally `AI_MODEL`, from env).
- **`cf-worker/`** — `worker.js` + `wrangler.toml`. The only host the browser
  talks to.
- **`layouts/partials/ai-widget.html`** + **`assets/ts/ai-widget.ts`** — the
  widget. Endpoint comes from the `aiChatURL` Hugo param; no secrets client-side.
  Also renders the current page as `data-ai-page-*` and gates the button on health.

### Endpoints

| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `POST /chat` | Worker injects `X-Proxy-Secret` | The chat. Worker validates + rate-limits + sanitizes, forwards `{message, page}` to the proxy. |
| `GET /health` | secret-gated at the proxy; public at the Worker | Button gate. Proxy confirms Ollama is up **and the model is pulled**; Worker edge-caches the boolean ~45s. |

### Health gate

The widget only shows its button when `GET /health` returns `{"ok":true}`. The
result is cached: **20 min when healthy, 3 min when unhealthy** (fast recovery)
in `localStorage`, plus ~45s at the Worker edge. Anything that isn't a clean 200
hides the button (fail-safe). `localhost` is bypassed (the button always shows in
`make dev`, since prod CORS blocks health checks from localhost).

> **Deploy all three layers in sync.** The site's gate JS depends on the Worker
> `/health` route *and* the proxy `/health`. Ship a site update without the
> matching Worker/proxy and the button hides everywhere. (This bit us once: the
> Worker 404'd `/health` while `/chat` worked fine.)

### Secrets / private values (never committed)

- `AI_PROXY_SECRET` — env var on the host running the proxy.
- `PROXY_SECRET` — Worker secret (`wrangler secret put PROXY_SECRET`); must equal
  `AI_PROXY_SECRET`.
- `TUNNEL_URL` — Worker var holding the private tunnel hostname; set at deploy
  time (or once in the dashboard so plain `wrangler deploy` works), never in source.

## Deploy / run checklist

1. Ollama up with the model: `ollama serve` + `ollama pull llama3.2` (any
   `llama3.2:*` tag works; `make ai-proxy-run` auto-detects what's installed).
2. Proxy: `export AI_PROXY_SECRET=…` then `make ai-proxy-run` (listens on `:6573`).
   Stop a stray instance with `make ai-proxy-stop`.
3. Tunnel: ingress `service` must be `http://localhost:6573`; then
   `cloudflared tunnel --config ~/.cloudflared/ai-tunnel.yml run ai-tunnel`.
4. Worker: from `cf-worker/` — `wrangler kv namespace create AI_RL` (paste id),
   `wrangler secret put PROXY_SECRET`, then
   `wrangler deploy --var TUNNEL_URL:https://<your-private-tunnel-host>`.
   (Find the host with `grep hostname ~/.cloudflared/ai-tunnel.yml`.)
5. Site: `make css && make build` and deploy `./public`.
6. Smoke test — health first, then chat:
   ```bash
   curl -s https://ai.wrightfunctions.com/health -H 'Origin: https://wrightfunctions.com'
   # expect: {"ok":true}

   curl -s https://ai.wrightfunctions.com/chat \
     -H 'Content-Type: application/json' \
     -H 'Origin: https://wrightfunctions.com' \
     -d '{"message":"Who is Konrad?"}'
   ```

`./scripts/setup-ai-tunnel.sh` automates steps 2–5 (it reads the tunnel host from
`~/.cloudflared`, so you don't need to type it); it's idempotent and safe to re-run.

## Migrating to konradwright.com (later)

Do this once `konradwright.com` is added as a zone on the same Cloudflare account
and the Pages site serves from it.

**Prerequisites**

1. Add `konradwright.com` as a zone in Cloudflare (update registrar nameservers).
2. Point the Pages project at `konradwright.com` (custom domain) so the site is
   actually served there — otherwise the browser origin won't match the new CORS
   allowlist.

**Code changes** (all the konradwright.com values the initial build used):

| File                                  | Change                                                        |
| ------------------------------------- | ------------------------------------------------------------- |
| `hugo.toml`                           | `baseURL` → `https://konradwright.com/`                       |
| `hugo.toml`                           | `params.aiChatURL` → `https://ai.konradwright.com/chat`       |
| `data/site.yaml`                      | `url` → `https://konradwright.com`                            |
| `cf-worker/worker.js`                 | `ALLOWED_ORIGINS` → `konradwright.com`, `www.konradwright.com` |
| `cf-worker/wrangler.toml`             | route `pattern` → `ai.konradwright.com`                       |
| `CONTEXT.md`                          | Website link → `https://konradwright.com` (cosmetic)          |

The proxy port (`:6573`) and the `/health` + per-page-context plumbing are
domain-independent — nothing to change there.

**Infra changes**

1. Re-point the tunnel DNS to the new zone (choose a private hostname on it —
   keep it out of committed files; the setup script reads it from `AI_TUNNEL_HOST`
   or `~/.cloudflared`):
   ```bash
   cloudflared tunnel route dns ai-tunnel <tunnel-host>
   ```
   Update `~/.cloudflared/ai-tunnel.yml` ingress `hostname` to that host (keep the
   `service` at `http://localhost:6573`) and restart the tunnel.
2. Redeploy the Worker with the new tunnel var:
   ```bash
   cd cf-worker
   wrangler deploy --var TUNNEL_URL:https://<tunnel-host>
   ```
3. Add the `ai.konradwright.com` custom domain in the dashboard (Workers & Pages →
   ai-chat → Settings → Domains & Routes → Add → Custom domain).
4. Rebuild + redeploy the site.

**Decommission the old hostnames** after cutover: delete the
`ai.wrightfunctions.com` custom domain and the old tunnel CNAME if you don't want
the feature reachable on both domains.

## Gotchas seen during setup

- **Button hidden but `/chat` works** → the Worker (or proxy) is stale and `/health`
  is 404/down while `/chat` is fine. Redeploy the Worker and restart the proxy so
  both have `/health`; see *Deploy all three layers in sync* above.
- **`bind: address already in use` on `:6573`** → a stale proxy is still running.
  `make ai-proxy-stop` (or `pkill -x ai-proxy`) clears it. Note `lsof -ti :PORT`
  lists *every* PID touching the port (the listener **and** cloudflared's
  connection to it), so a naive `kill` can miss the actual listener — match by
  name instead.
- `cloudflared tunnel route dns` for a hostname on a zone that isn't on the
  account creates a CNAME with a **doubled apex** (`host.newzone.currentzone`),
  because cloudflared appends the only zone it finds. If you see that, the target
  zone isn't on the account — delete the stray CNAME in the DNS panel.
- Wrangler `kv namespace create` / `deploy` failing with a `/memberships` 403 or
  auth `10000` means the token lacks permissions. Fix: `export CLOUDFLARE_ACCOUNT_ID=…`,
  re-`wrangler login` granting all scopes, or use a scoped API token via
  `CLOUDFLARE_API_TOKEN` (Account: Workers Scripts + Workers KV Storage, Edit).
  The custom domain is dashboard-managed precisely to avoid needing Zone perms.
- `--var TUNNEL_URL:…` only sets the var for that one deploy. Set `TUNNEL_URL`
  once in the dashboard (Workers & Pages → ai-chat → Settings → Variables) so a
  plain `wrangler deploy` works thereafter.
- The shared secret belongs only in the `AI_PROXY_SECRET` env var and the Worker
  secret store — never in a file in the repo or on disk.
