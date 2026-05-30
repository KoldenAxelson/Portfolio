# OX on Cloudflare

> A recommended deployment path for the [OX Stack](./ox-stack.md), pairing it
> with Cloudflare (Pages, Workers, D1, R2, KV) and AWS (SES, S3). OX itself is
> host-agnostic — this is one concrete, cost-optimized way to run it, not part
> of the core stack. Swap any layer for an equivalent if your infrastructure
> differs.

This companion assumes a project that uses the dynamic half of OX (Go + HTMX). A
purely static site needs only the "Static content" line below.

---

## Hosting architecture

```
Static content     → Cloudflare Pages (free, unlimited bandwidth)
Dynamic endpoints  → Cloudflare Workers (100k requests/day free)
Canonical database → Cloudflare D1 (SQLite, 5GB free)
Search index       → Meilisearch on Lightsail ($5/month)
Media storage      → Cloudflare R2 (10GB free, no egress fees)
Session / KV store → Cloudflare KV (100k reads/day free)
Email              → AWS SES
Backups            → AWS S3
```

The static/dynamic split (from the core stack) maps onto Cloudflare cleanly:

```
Visitor reads a page    → Cloudflare Pages CDN (~50ms TTFB, $0)
Visitor takes an action → Cloudflare Worker → D1 / Go service
Visitor searches        → Cloudflare Worker → Meilisearch or Vectorize
```

Public pages consume zero Worker budget; only authenticated actions, writes, and
search reach compute.

---

## Database — two D1 databases, scoped by binding

Split data by trust boundary into two D1 databases, and bind each Worker only to
what it needs:

- **PUBLIC_DB** — canonical/public dataset: catalog records, aggregate stats,
  public metadata. Populated by an ingestion pipeline; readable by API
  consumers via scoped keys; powers Meilisearch sync and Vectorize embeddings.
  Never contains user PII.
- **USER_DB** — accounts, auth tokens, personal data, activity. Bound only to
  application Workers; never to API-facing Workers.

Because a Worker can only reach databases it's bound to, a misconfigured route
in the API layer **structurally cannot** read USER_DB — the isolation is a
deploy-time binding fact, not a runtime check.

---

## Search — keyword + semantic

Dual-mode search, both returning the same HTML-fragment shape so the toggle is
just a Worker routing decision (same page, same HTMX target, different backend):

- **Keyword — Meilisearch.** Self-hosted on a $5/month Lightsail instance
  (1–2GB RAM). Typo-tolerant, faceted, instant autocomplete; fires on keystroke
  with debounce. Multiple indexes per instance, scoped API keys per index.
- **Semantic — Cloudflare Vectorize.** Natural-language ("things like X")
  queries; embeddings generated at index time via Workers AI; fires on submit.
  Free tier covers 30M queried / 5M stored dimensions per month.

---

## Image pipeline

```
Raw image → Go service (via Cloudflare Tunnel during seed)
         → convert to WebP/AVIF at fixed resolution
         → strip EXIF
         → push to R2
         → served via the Cloudflare CDN
```

Target 15–25KB per image. Cloudflare Polish handles ongoing optimization for
user-uploaded content.

---

## Security hardening (infrastructure)

The structural protections (`sqlc`, header-based CSRF) live in the core stack.
The deployment adds:

| Threat | Mitigation | Approach |
|---|---|---|
| Privilege escalation | Worker DB binding scope (USER_DB unbound from API Workers) | Structural |
| Meilisearch exposure | Lightsail firewall, Cloudflare IPs only | Configuration |
| S3 backup exposure | Explicit deny-public bucket policy | Configuration |
| Webhook spoofing | Signature verification (e.g. Stripe SDK) | Code |
| SSRF | URL allowlisting in Workers | Code |
| OAuth open redirect | Strict redirect allowlist | Code |
| Rate-limit abuse | Cloudflare rate-limiting rules | Configuration |
| API-key theft | KV usage counters + anomaly detection | Code |

---

## Authentication & sessions

OAuth-only (no password storage) — Google for general users, platform-specific
providers where the domain calls for it. The stateless JWT sessions from the
core stack are stored in **Cloudflare KV** with expiry, so no session database
is needed.

---

## API product layer

For projects that expose a public API:

- Cloudflare Workers handle API routing and rate limiting.
- KV stores API keys and per-key request counters; rate limiting happens at the
  Worker before any database is touched.
- Stripe gates paid tiers.
- API consumers get read access to PUBLIC_DB only; USER_DB is never in scope for
  API-facing Workers.

---

## Email & backups

- **Transactional email — AWS SES**: auth-flow edge cases, notification digests,
  recovery mail. Reliable and cheap at scale.
- **Backups — AWS S3**: full D1 snapshots on a nightly/weekly/monthly/quarterly
  cadence; Meilisearch index snapshots on the same schedule (rebuild from
  snapshot rather than full reindex on failure). The bucket denies public
  access; a write-only IAM role runs backups, a separate read-only role
  restores.

---

## Monthly cost baseline

| Service | Cost |
|---|---|
| Cloudflare Pages / Workers / D1 (×2) / R2 / KV | $0 (free tiers) |
| Lightsail (Meilisearch) | $5 |
| AWS SES | ~$0 at early scale |
| AWS S3 backups | ~$1–2 |
| **Total** | **~$6–7/month** |

---

## Upgrade triggers

| Trigger | Action |
|---|---|
| >100k Worker requests/day | Workers Paid ($5/month base) |
| Image optimization needed | Cloudflare Pro ($20/month) — enables Polish |
| R2 beyond 10GB | $0.015/GB, still cheap |
| D1 write pressure | Evaluate Turso or Hyperdrive |
| Real-time features | Cloudflare Durable Objects |
| Search RAM pressure | Larger Lightsail plan ($10/month) |
| Complex relational queries | External Postgres |
