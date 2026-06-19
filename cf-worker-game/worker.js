/**
 * Agar.io clone — names Worker.
 *
 * A self-contained Cloudflare Worker, deployed separately from any other Worker
 * on the site. It backs the game's live name pool: real visitor-submitted names
 * are stored in KV (namespace `AGAR_NAMES`) and served back to every player so
 * the bot field feels like a live server.
 *
 * Routes:
 *   GET  /agar/names  → { "names": [ "string", ... ] }   (all stored names)
 *   POST /agar/names  → body { "name": "string" }         (store a name)
 *        200 on success, 400 invalid, 429 rate-limited.
 *
 * Storage model:
 *   name:{uuid}   value { "name": string, "submitted_at": ISO8601 }  (per spec)
 *   seen:{name}   value "1"  — dedupe index + cheap key-only listing for GET
 *   rl:{ip}       value count — per-IP submission counter (1h TTL)
 *
 * Entries are never deleted; the pool only grows.
 */

const ALLOWED_ORIGINS = new Set([
  'https://konradwright.com',
  'https://www.konradwright.com',
]);

const MAX_NAME_LEN = 32;
const RATE_LIMIT = 3; // max submissions ...
const RATE_WINDOW_SECONDS = 60 * 60; // ... per IP per hour

// Hardcoded dummy name list (recruiter-style + company names), baked into the
// Worker per spec. ~80 names.
const DUMMY_NAMES = [
  'James R.', 'Sarah K.', 'Priya M.', 'Derek H.', 'Michelle T.', 'Brandon L.',
  'Ashley W.', 'Kevin O.', 'Natalie F.', 'Tyler B.', 'Rachel S.', 'Marcus J.',
  'Jennifer C.', 'Ryan P.', 'Danielle N.', 'Chris A.', 'Stephanie G.', 'Andrew V.',
  'Lauren E.', 'Jason D.', 'David H.', 'Megan R.', 'Patrick L.', 'Olivia T.',
  'Sean M.', 'Amanda B.', 'Kyle Z.', 'Brittany F.', 'Nathan C.', 'Caitlin W.',
  'Trevor J.', 'Monica S.', 'Garrett P.', 'Vanessa K.', 'Austin R.', 'Heather D.',
  'Logan N.', 'Tiffany A.', 'Blake E.', 'Amber O.', 'Justin M.', 'Samantha L.',
  'Connor H.', 'Kayla B.', 'Zachary F.', 'Lindsey C.', 'Ian T.', 'Rebecca G.',
  'Dustin W.', 'Alexis J.',
  'Raytheon', 'Lockheed Martin', 'Palantir', 'Booz Allen', 'SAIC', 'Leidos',
  'Northrop Grumman', 'General Dynamics', 'ManTech', 'CACI', 'Perspecta',
  'Accenture Federal', 'Deloitte', 'L3Harris', 'BAE Systems', 'Boeing', 'Textron',
  'DXC Technology', 'Unison', 'Maximus', 'Amentum', 'Parsons', 'Engility', 'KEYW',
  'Alion', 'Noblis', 'Jacobs', 'Peraton', 'SciTec', 'Torch Technologies',
];

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // Preflight.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname !== '/agar/names') {
      return json({ error: 'not found' }, 404, origin);
    }

    if (request.method === 'GET') {
      return handleGet(env, origin);
    }
    if (request.method === 'POST') {
      return handlePost(request, env, origin);
    }
    return json({ error: 'method not allowed' }, 405, origin);
  },
};

async function handleGet(env, origin) {
  const names = [];
  // List the `seen:` index — the name lives in the key, so no per-key reads.
  let cursor;
  do {
    const list = await env.AGAR_NAMES.list({ prefix: 'seen:', cursor });
    for (const key of list.keys) {
      names.push(key.name.slice('seen:'.length));
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  return json({ names }, 200, origin);
}

async function handlePost(request, env, origin) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400, origin);
  }

  // Validate: non-empty string, trimmed, max 32 chars.
  const raw = typeof payload?.name === 'string' ? payload.name.trim() : '';
  if (!raw || raw.length > MAX_NAME_LEN) {
    return json({ error: 'invalid name' }, 400, origin);
  }

  // Rate limit: max RATE_LIMIT submissions per IP per hour.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = `rl:${ip}`;
  const current = parseInt((await env.AGAR_NAMES.get(rlKey)) || '0', 10);
  if (current >= RATE_LIMIT) {
    return json({ error: 'rate limited' }, 429, origin);
  }
  // Bump the counter; refresh the 1h window each submission.
  await env.AGAR_NAMES.put(rlKey, String(current + 1), {
    expirationTtl: RATE_WINDOW_SECONDS,
  });

  // Dedupe by exact name string — store each unique name only once.
  const seenKey = `seen:${raw}`;
  const exists = await env.AGAR_NAMES.get(seenKey);
  if (exists) {
    return json({ ok: true, duplicate: true }, 200, origin);
  }

  await env.AGAR_NAMES.put(seenKey, '1');
  await env.AGAR_NAMES.put(
    `name:${crypto.randomUUID()}`,
    JSON.stringify({ name: raw, submitted_at: new Date().toISOString() }),
  );

  return json({ ok: true }, 200, origin);
}

// Exported so it can be unit-tested or reused; the game also keeps its own copy
// for the offline fallback.
export { DUMMY_NAMES };
