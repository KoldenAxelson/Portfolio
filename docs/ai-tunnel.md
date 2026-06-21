# AI Tunnel — operations & domain-migration notes

The "Ask about Konrad" chat widget is backed by a local Ollama instance exposed
through a Cloudflare Tunnel and guarded by a Cloudflare Worker. Full design:
`SPEC-ai-agent.md`. This doc covers what's deployed today and exactly what to
change to move the feature from **wrightfunctions.com** to **konradwright.com**
later.

## Current state (wrightfunctions.com)

The feature runs entirely on the `wrightfunctions.com` Cloudflare zone — the
live site's zone. `konradwright.com` is **not** a zone on the Cloudflare account
yet, which is why the initial setup pointed here instead.

| Piece            | Value                                   |
| ---------------- | --------------------------------------- |
| Site baseURL     | `https://wrightfunctions.com/`          |
| Worker host      | `ai.wrightfunctions.com`                |
| Tunnel hostname  | _private_ — set as the Worker `TUNNEL_URL` var / `~/.cloudflared`; never committed |
| Browser endpoint | `https://ai.wrightfunctions.com/chat` (Hugo param `aiChatURL`) |
| CORS allowlist   | `wrightfunctions.com`, `www.wrightfunctions.com` |

### Components

- **`CONTEXT.md`** — hand-maintained agent knowledge. Edit freely; the proxy
  reads it at startup (restart the proxy after edits).
- **`ai-proxy/main.go`** — Go proxy in front of Ollama. Build/run with
  `make ai-proxy` / `make ai-proxy-run` (reads `AI_PROXY_SECRET` from env).
- **`cf-worker/`** — `worker.js` + `wrangler.toml`. The only host the browser
  talks to.
- **`layouts/partials/ai-widget.html`** + **`assets/ts/ai-widget.ts`** — the
  widget. Endpoint comes from the `aiChatURL` Hugo param; no secrets client-side.

### Secrets / private values (never committed)

- `AI_PROXY_SECRET` — env var on the host running the proxy.
- `PROXY_SECRET` — Worker secret (`wrangler secret put PROXY_SECRET`); must equal
  `AI_PROXY_SECRET`.
- `TUNNEL_URL` — Worker var holding the private tunnel hostname; set at deploy
  time, never in source.

## Deploy / run checklist

1. Ollama up with the model: `ollama serve` + `ollama pull llama3.2`.
2. Proxy: `export AI_PROXY_SECRET=…` then `make ai-proxy-run`.
3. Tunnel: `cloudflared tunnel --config ~/.cloudflared/ai-tunnel.yml run ai-tunnel`.
4. Worker: from `cf-worker/` — `wrangler kv namespace create AI_RL` (paste id),
   `wrangler secret put PROXY_SECRET`, then
   `wrangler deploy --var TUNNEL_URL:https://<your-private-tunnel-host>`.
5. Site: `make css && make build` and deploy `./public`.
6. Smoke test:
   ```bash
   curl -s https://ai.wrightfunctions.com/chat \
     -H 'Content-Type: application/json' \
     -H 'Origin: https://wrightfunctions.com' \
     -d '{"message":"Who is Konrad?"}'
   ```

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

**Infra changes**

1. Re-point the tunnel DNS to the new zone (choose a private hostname on it —
   keep it out of committed files; the setup script reads it from `AI_TUNNEL_HOST`
   or `~/.cloudflared`):
   ```bash
   cloudflared tunnel route dns ai-tunnel <tunnel-host>
   ```
   Update `~/.cloudflared/ai-tunnel.yml` ingress `hostname` to that host and
   restart the tunnel.
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

- `cloudflared tunnel route dns` for a hostname on a zone that isn't on the
  account creates a CNAME with a **doubled apex** (`host.newzone.currentzone`),
  because cloudflared appends the only zone it finds. If you see that, the target
  zone isn't on the account — delete the stray CNAME in the DNS panel.
- Wrangler `kv namespace create` failing with a `/memberships` 403 means the
  OAuth token can't read user details. Fix: `export CLOUDFLARE_ACCOUNT_ID=…`, or
  re-run `wrangler login` granting all scopes, or use a scoped API token via
  `CLOUDFLARE_API_TOKEN`.
- The shared secret belongs only in the `AI_PROXY_SECRET` env var and the Worker
  secret store — never in a file in the repo or on disk.
