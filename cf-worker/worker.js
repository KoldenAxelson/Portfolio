/**
 * Portfolio AI chat — edge Worker.
 *
 * Deployed to `ai.wrightfunctions.com`. This is the ONLY URL the browser ever calls.
 * It rate-limits at the edge, validates and re-sanitizes the message, injects the
 * shared secret, and forwards to the private Cloudflare Tunnel hostname (the Go
 * proxy in front of Ollama). The tunnel hostname and the secret are never in this
 * source — they come from Worker bindings:
 *
 *   TUNNEL_URL    (var)    the private tunnel hostname, e.g. https://<tunnel-host>
 *                          — set in the Cloudflare dashboard; NOT committed, NOT
 *                          in client code.
 *   PROXY_SECRET  (secret) shared secret matching the Go proxy's AI_PROXY_SECRET.
 *                          `wrangler secret put PROXY_SECRET`.
 *   AI_RL         (KV)     namespace used for per-IP rate-limit counters.
 *
 * Response contract back to the widget (all JSON, with CORS):
 *   200 { reply }                               — model answered
 *   429 { error: "rate_limited", scope: "minute" }  — slow down, retry shortly
 *   429 { error: "rate_limited", scope: "day" }     — daily cap; show contact CTA
 *   503 { error: "spike_detected" }             — global circuit open
 *   503 { error: "model_timeout" }              — model took too long
 *   400 { error: "bad_request" }                — malformed / oversized
 *   502 { error: "upstream_error" }             — proxy/tunnel unreachable
 */

const ALLOWED_ORIGINS = new Set([
  'https://wrightfunctions.com',
  'https://www.wrightfunctions.com',
]);

const MAX_BODY_BYTES = 4 * 1024; // 4 KB (message + current-page context)
const MAX_MESSAGE_LEN = 500;
const PER_MINUTE_LIMIT = 5;
const PER_DAY_LIMIT = 30;

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// Coerce an untrusted field to a clean, length-capped string (or '' if absent).
function cleanField(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Health probe for the widget's button gate. Returns { ok } with a 200/503 status.
 * The boolean is edge-cached (~45s) so a burst of page loads doesn't fan out into
 * a burst of Ollama checks; the client also caches it (minutes). Cached under a
 * synthetic key without CORS headers, then re-wrapped with per-origin CORS.
 */
async function handleHealth(request, env, origin) {
  if (request.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405, origin);
  }
  const cache = caches.default;
  const cacheKey = new Request('https://ai-health.internal/status');

  let ok;
  const hit = await cache.match(cacheKey);
  if (hit) {
    ok = ((await hit.json()) || {}).ok === true;
  } else {
    ok = await probeUpstream(env);
    const cached = new Response(JSON.stringify({ ok }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=45' },
    });
    await cache.put(cacheKey, cached);
  }
  // Short browser cache so it isn't flagged as "no cache lifetime"; well under
  // the widget's localStorage TTLs, so it can't mask a recovery.
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30',
      ...corsHeaders(origin),
    },
  });
}

// Ask the proxy (behind the tunnel) whether the chat can answer right now.
async function probeUpstream(env) {
  if (!env.TUNNEL_URL || !env.PROXY_SECRET) return false;
  try {
    const r = await fetch(`${env.TUNNEL_URL.replace(/\/+$/, '')}/health`, {
      headers: { 'X-Proxy-Secret': env.PROXY_SECRET },
      cf: { cacheTtl: 0 },
    });
    return r.ok;
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // CORS preflight.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Health probe — public, GET, edge-cached. The widget gates its button on it.
    if (url.pathname === '/health') {
      return handleHealth(request, env, origin);
    }

    if (url.pathname !== '/chat') {
      return json({ error: 'not_found' }, 404, origin);
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, origin);
    }

    // Content-Type must be JSON.
    const ct = request.headers.get('Content-Type') || '';
    if (!ct.includes('application/json')) {
      return json({ error: 'bad_request' }, 400, origin);
    }

    // Body size guard (header hint + hard read cap).
    const declared = Number(request.headers.get('Content-Length') || '0');
    if (declared > MAX_BODY_BYTES) {
      return json({ error: 'bad_request' }, 400, origin);
    }

    let raw;
    try {
      raw = await request.text();
    } catch {
      return json({ error: 'bad_request' }, 400, origin);
    }
    if (raw.length > MAX_BODY_BYTES) {
      return json({ error: 'bad_request' }, 400, origin);
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: 'bad_request' }, 400, origin);
    }

    // Sanitize the message: must be a string; collapse control chars; trim; cap.
    let message = typeof payload?.message === 'string' ? payload.message : '';
    message = message.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!message || message.length > MAX_MESSAGE_LEN) {
      return json({ error: 'bad_request' }, 400, origin);
    }

    // Optional current-page context — same sanitize, length-capped per field.
    const page = {
      title: cleanField(payload?.page?.title, 200),
      url: cleanField(payload?.page?.url, 300),
      desc: cleanField(payload?.page?.desc, 500),
    };

    // Per-IP rate limiting at the edge (KV). Minute window first, then daily cap.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const limited = await checkRateLimit(env, ip);
    if (limited) {
      return json({ error: 'rate_limited', scope: limited }, 429, origin);
    }

    // Forward to the private tunnel with the shared secret injected.
    if (!env.TUNNEL_URL || !env.PROXY_SECRET) {
      return json({ error: 'upstream_error' }, 502, origin);
    }

    let upstream;
    try {
      upstream = await fetch(`${env.TUNNEL_URL.replace(/\/+$/, '')}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Proxy-Secret': env.PROXY_SECRET,
          // Pass the real visitor IP so the proxy logs/limits by client, not by
          // the tunnel hop.
          'X-Forwarded-For': ip,
        },
        body: JSON.stringify({ message, page }),
      });
    } catch {
      return json({ error: 'upstream_error' }, 502, origin);
    }

    // Map upstream (Go proxy) responses to the widget contract.
    let data = {};
    try {
      data = await upstream.json();
    } catch {
      // fall through with empty object
    }

    if (upstream.ok && typeof data.reply === 'string') {
      return json({ reply: data.reply }, 200, origin);
    }

    const code = data.error || '';
    if (upstream.status === 503 && code === 'spike_detected') {
      return json({ error: 'spike_detected' }, 503, origin);
    }
    if (upstream.status === 503 && code === 'model_timeout') {
      return json({ error: 'model_timeout' }, 503, origin);
    }
    if (upstream.status === 429) {
      // Proxy-side limit; treat as a transient minute-scope slowdown.
      return json({ error: 'rate_limited', scope: 'minute' }, 429, origin);
    }

    return json({ error: 'upstream_error' }, 502, origin);
  },
};

/**
 * Per-IP rate limit using KV counters with fixed time buckets.
 *
 * Keys (each carries its own TTL so cleanup is automatic):
 *   m:{ip}:{minuteBucket}  → count, TTL 60s
 *   d:{ip}:{dayBucket}     → count, TTL 86400s
 *
 * Returns 'minute' or 'day' when the respective cap is exceeded, else null.
 * KV is eventually consistent, so this is a best-effort edge guard; the Go proxy
 * enforces the same limits authoritatively behind the tunnel.
 */
async function checkRateLimit(env, ip) {
  if (!env.AI_RL) return null; // no KV bound → skip edge limiting (proxy still guards)

  const now = Date.now();
  const minuteBucket = Math.floor(now / 60000);
  const dayBucket = Math.floor(now / 86400000);
  const minKey = `m:${ip}:${minuteBucket}`;
  const dayKey = `d:${ip}:${dayBucket}`;

  const [minRaw, dayRaw] = await Promise.all([
    env.AI_RL.get(minKey),
    env.AI_RL.get(dayKey),
  ]);
  const minCount = parseInt(minRaw || '0', 10);
  const dayCount = parseInt(dayRaw || '0', 10);

  if (dayCount >= PER_DAY_LIMIT) return 'day';
  if (minCount >= PER_MINUTE_LIMIT) return 'minute';

  // Count this request. TTLs keep the keyspace bounded.
  await Promise.all([
    env.AI_RL.put(minKey, String(minCount + 1), { expirationTtl: 60 }),
    env.AI_RL.put(dayKey, String(dayCount + 1), { expirationTtl: 86400 }),
  ]);
  return null;
}
