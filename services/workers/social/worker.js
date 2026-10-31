// The posting desk for wrightfunctions.com: once a day it reads the site's
// social queue (/social/queue.json, built by scripts/social/build-queue.py
// from data/social/queue.yaml) and sends whatever is due.
//
//   dev.to    Cross-posts the article through the dev.to API, published, with a
//             canonical link to the site. Only once the page is live.
//   LinkedIn  Emails Konrad the finished post. The email's button opens this
//             Worker's /p/<id> page, where one tap copies the post and opens
//             LinkedIn's composer. (LinkedIn won't let this account create the
//             company page its posting API needs yet; when it does, this step
//             becomes an API call and the email goes away.)
//
// What's been sent is remembered in KV (SOCIAL) by post id, so nothing goes
// twice and a missed day catches up the next morning, one dev.to article a
// day so a backlog doesn't land all at once. Report lines wait in KV until an
// email carrying them gets through. Bindings and secrets are set by
// scripts/social/deploy.py:
//
//   SOCIAL         KV namespace
//   MAILER         send_email binding, locked to Konrad's verified address
//   DEVTO_API_KEY  secret
//   RUN_KEY        secret, sent as "Authorization: Bearer <key>" to /run, /status and /test
//   QUEUE_URL, MAIL_FROM, MAIL_TO, PAGE_BASE   plain vars

import { EmailMessage } from "cloudflare:email";

const TZ = "America/Los_Angeles";
const UA = "wrightfunctions-social/1.0 (+https://wrightfunctions.com)";
const GREEN = "#037737";
const LOCK_TTL_S = 300; // a run holds this long at most; KV's minimum TTL is 60
const SUBJECT_CHUNK = 45; // bytes per RFC 2047 encoded-word, so each stays under 75 characters

// ---- Small helpers -------------------------------------------------------

function today() {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  // 76-character lines, as MIME expects.
  return btoa(bin).replace(/(.{76})/g, "$1\r\n");
}

// A subject as encoded-words of at most SUBJECT_CHUNK bytes, cut on
// character boundaries and folded onto continuation lines.
function encodedSubject(s) {
  const words = [];
  let chunk = "";
  for (const ch of s) {
    if (new TextEncoder().encode(chunk + ch).length > SUBJECT_CHUNK) { words.push(chunk); chunk = ""; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${b64(w).replace(/\r\n/g, "")}?=`).join("\r\n ");
}

async function authorized(request, env) {
  const given = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(env.RUN_KEY || "");
  return a.byteLength === b.byteLength && b.byteLength > 0 && crypto.subtle.timingSafeEqual(a, b);
}

async function loadQueue(env) {
  const res = await fetch(`${env.QUEUE_URL}?t=${Date.now()}`, { headers: { "User-Agent": UA }, cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error(`queue: HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// Live means: it answers 200, it's the page itself (its canonical link is this
// URL, so a host's fallback page doesn't count), and it isn't a sealed or
// in-review page, which the site marks noindex.
async function isLive(url) {
  const res = await fetch(url, { method: "GET", headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) return false;
  const html = await res.text();
  const canonical = html.match(/<link[^>]*rel="?canonical"?[^>]*href="?([^"\s>]+)/i);
  if (!canonical || canonical[1] !== url) return false;
  return !/<meta[^>]*name="?robots"?[^>]*noindex/i.test(html);
}

// ---- dev.to --------------------------------------------------------------

const DEVTO_HEADERS = (env) => ({
  "api-key": env.DEVTO_API_KEY,
  "accept": "application/vnd.forem.api-v1+json",
  "content-type": "application/json",
  "User-Agent": UA,
});

// The body carries dev.to front matter (title, tags, cover, canonical link,
// AI disclosure), written by build-queue.py, so it's the whole request.
async function postToDevto(env, item) {
  const res = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: DEVTO_HEADERS(env),
    body: JSON.stringify({ article: { body_markdown: item.devto.body_markdown } }),
  });
  const text = await res.text();
  if (res.ok) return JSON.parse(text).url;
  // dev.to refuses a second published article with the same canonical URL. If
  // that's why, the article is already there (an earlier run posted it and
  // then failed to record it): find it and record it instead of failing daily.
  if (res.status === 422 && /canonical/i.test(text)) {
    const found = await findOnDevto(env, item.devto.canonical_url);
    if (found) return found;
  }
  throw new Error(`dev.to: HTTP ${res.status}: ${text.slice(0, 300)}`);
}

async function findOnDevto(env, canonical) {
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://dev.to/api/articles/me/all?per_page=100&page=${page}`, { headers: DEVTO_HEADERS(env) });
    if (!res.ok) return null;
    const list = await res.json();
    const hit = list.find((a) => a.canonical_url === canonical);
    if (hit) return hit.url;
    if (list.length < 100) return null;
  }
  return null;
}

// ---- The email -----------------------------------------------------------

function emailHtml(env, posts, notes) {
  const cards = posts.map((p) => `
  <tr><td style="padding:0 0 28px">
    <p style="margin:0 0 6px;font:600 12px/1.4 -apple-system,Segoe UI,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">LinkedIn post · ${esc(p.date)}</p>
    <p style="margin:0 0 14px;font:700 18px/1.35 -apple-system,Segoe UI,Arial,sans-serif;color:#111">${esc(p.title)}</p>
    <a href="${esc(env.PAGE_BASE)}/p/${encodeURIComponent(p.id)}" style="display:block;padding:16px 20px;border-radius:12px;background:${GREEN};color:#fff;text-align:center;text-decoration:none;font:700 17px/1.2 -apple-system,Segoe UI,Arial,sans-serif">Copy post &amp; open LinkedIn</a>
    <p style="margin:12px 0 0;font:13px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#6b7280">Tap the button, then paste into the post box and press Post. The text is below if you'd rather copy it here.</p>
    <pre style="margin:12px 0 0;padding:14px 16px;border-radius:10px;background:#f6f5f1;border:1px solid #e5e2d9;white-space:pre-wrap;word-wrap:break-word;font:14px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#111">${esc(p.linkedin)}</pre>
  </td></tr>`).join("");
  const extra = notes.length
    ? `<tr><td style="padding:0 0 20px;font:13px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#374151">${notes.map(esc).join("<br>")}</td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:24px 16px;background:#ffffff">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto">
${cards}${extra}
<tr><td style="padding-top:8px;border-top:1px solid #e5e7eb;font:12px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#9ca3af">Sent by the wrightfunctions.com posting Worker. The queue lives in data/social/queue.yaml.</td></tr>
</table></body></html>`;
}

function emailText(env, posts, notes) {
  const parts = posts.map((p) => `${p.title}\nCopy & open LinkedIn: ${env.PAGE_BASE}/p/${encodeURIComponent(p.id)}\n\n${p.linkedin}\n`);
  return parts.join("\n----\n\n") + (notes.length ? `\n${notes.join("\n")}\n` : "");
}

async function sendEmail(env, subject, html, text) {
  const boundary = `wf-${crypto.randomUUID()}`;
  const raw = [
    `From: wrightfunctions.com <${env.MAIL_FROM}>`,
    `To: ${env.MAIL_TO}`,
    `Subject: ${encodedSubject(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@wrightfunctions.com>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  await env.MAILER.send(new EmailMessage(env.MAIL_FROM, env.MAIL_TO, raw));
}

// ---- The daily run -------------------------------------------------------

async function remember(env, key, value) {
  try { await env.SOCIAL.put(key, JSON.stringify(value)); return true; }
  catch (err) { console.error(`KV put ${key} failed`, err); return false; }
}

async function pendingNotes(env) {
  return JSON.parse((await env.SOCIAL.get("notes:pending")) || "[]");
}

async function run(env) {
  // A second run while one is going (cron plus a manual /run) would read the
  // same "not sent yet" state. KV isn't transactional, so this only narrows
  // the window, but the window is the problem.
  if (await env.SOCIAL.get("lock")) return { skipped: "another run is in progress" };
  await env.SOCIAL.put("lock", "1", { expirationTtl: LOCK_TTL_S });
  try {
    return await runLocked(env);
  } finally {
    await env.SOCIAL.delete("lock");
  }
}

async function runLocked(env) {
  const day = today();
  const items = (await loadQueue(env)).filter((i) => i.date <= day);
  const linkedin = [];
  const notes = await pendingNotes(env);
  let devtoPosted = false;
  for (const item of items) {
    const devtoDue = item.devto && !(await env.SOCIAL.get(`devto:${item.id}`));
    const linkedinDue = item.linkedin && !(await env.SOCIAL.get(`li:${item.id}`));
    if (!devtoDue && !linkedinDue) continue;
    // Both posts link to the page, so neither goes out until it's live.
    if (!(await isLive(item.url).catch(() => false))) {
      notes.push(`Held "${item.title}": ${item.url} isn't live yet. It'll go out the first morning it is.`);
      continue;
    }
    if (devtoDue && devtoPosted) {
      notes.push(`dev.to: "${item.title}" is due and goes out tomorrow (one a day).`);
    } else if (devtoDue) {
      devtoPosted = true;
      try {
        const url = await postToDevto(env, item);
        await remember(env, `devto:${item.id}`, { url, at: new Date().toISOString() });
        notes.push(`dev.to: published "${item.title}": ${url}`);
      } catch (err) {
        notes.push(`dev.to: couldn't post "${item.title}" (it'll retry tomorrow): ${err.message}`);
      }
    }
    if (linkedinDue) linkedin.push(item);
  }
  notes.splice(0, notes.length, ...new Set(notes)); // a held item repeats in carried-over notes
  if (!linkedin.length && !notes.length) return { day, due: items.map((i) => i.id), emailed: [], notes };
  // The copy page reads the post from KV, so it never has to fetch the queue.
  for (const item of linkedin) await remember(env, `post:${item.id}`, { title: item.title, linkedin: item.linkedin });
  const subject = linkedin.length === 1 ? `LinkedIn post ready: ${linkedin[0].title}`
    : linkedin.length > 1 ? `${linkedin.length} LinkedIn posts ready`
    : "wrightfunctions.com posting report";
  try {
    await sendEmail(env, subject, emailHtml(env, linkedin, notes), emailText(env, linkedin, notes));
  } catch (err) {
    // Keep the report for the next email; the LinkedIn posts stay unsent and
    // go out with it.
    await remember(env, "notes:pending", notes);
    throw err;
  }
  await env.SOCIAL.delete("notes:pending");
  for (const item of linkedin) await remember(env, `li:${item.id}`, { emailed: new Date().toISOString() });
  return { day, due: items.map((i) => i.id), emailed: linkedin.map((i) => i.id), notes };
}

// ---- The copy page -------------------------------------------------------

function copyPage(item) {
  const composer = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(item.linkedin)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(item.title)} · LinkedIn post</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;padding:20px 16px 40px;font:16px/1.55 -apple-system,Segoe UI,Inter,Arial,sans-serif;background:#faf9f5;color:#111}
  main{max-width:560px;margin:0 auto}
  .k{margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6b7280}
  h1{margin:0 0 18px;font-size:20px;line-height:1.3}
  button,a.btn{display:block;width:100%;box-sizing:border-box;padding:17px 20px;border:0;border-radius:14px;font:700 17px/1.2 -apple-system,Segoe UI,Inter,Arial,sans-serif;text-align:center;text-decoration:none;cursor:pointer}
  #go{background:${GREEN};color:#fff}
  #copy{margin-top:10px;background:transparent;color:${GREEN};border:2px solid ${GREEN}}
  #msg{min-height:1.4em;margin:12px 0 0;text-align:center;font-weight:600;color:${GREEN}}
  pre{margin:18px 0 0;padding:16px;border-radius:12px;background:#fff;border:1px solid #e5e2d9;white-space:pre-wrap;word-wrap:break-word;font:15px/1.55 -apple-system,Segoe UI,Inter,Arial,sans-serif}
  @media (prefers-color-scheme:dark){body{background:#111;color:#eee}pre{background:#1b1b1b;border-color:#333}}
</style></head><body><main>
<p class="k">LinkedIn post</p><h1>${esc(item.title)}</h1>
<button id="go" type="button">Copy post &amp; open LinkedIn</button>
<button id="copy" type="button">Copy only</button>
<p id="msg" role="status"></p>
<pre id="post">${esc(item.linkedin)}</pre>
</main><script>
const text = document.getElementById("post").textContent;
const msg = document.getElementById("msg");
async function copy() {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const r = document.createRange(); r.selectNodeContents(document.getElementById("post"));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand("copy");
  }
  msg.textContent = "Copied. Paste it into LinkedIn and press Post.";
}
document.getElementById("copy").addEventListener("click", copy);
document.getElementById("go").addEventListener("click", async () => {
  await copy();
  setTimeout(() => { location.href = ${JSON.stringify(composer)}; }, 450);
});
</script></body></html>`;
}

// ---- Entry points --------------------------------------------------------

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env).catch((err) => console.error("social run failed", err)));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const page = url.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/);
    if (page) {
      const item = JSON.parse((await env.SOCIAL.get(`post:${page[1]}`)) || "null");
      if (!item) return new Response("Not found", { status: 404 });
      return new Response(copyPage(item), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (!["/run", "/status", "/test"].includes(url.pathname) || !(await authorized(request, env))) {
      return new Response("Not found", { status: 404 });
    }
    if (url.pathname === "/run") return Response.json(await run(env));
    if (url.pathname === "/test") {
      // A sample email with the first queued post, marking nothing as sent.
      const item = (await loadQueue(env)).find((i) => i.linkedin);
      if (!item) return Response.json({ sent: false, reason: "nothing in the queue" });
      await remember(env, `post:${item.id}`, { title: item.title, linkedin: item.linkedin });
      const note = ["This is a test. Nothing was posted or marked as sent."];
      await sendEmail(env, `Test: LinkedIn post ready: ${item.title}`, emailHtml(env, [item], note), emailText(env, [item], note));
      return Response.json({ sent: true, id: item.id });
    }
    const items = await loadQueue(env);
    const rows = [];
    for (const i of items) {
      rows.push({ id: i.id, date: i.date,
        devto: i.devto ? JSON.parse((await env.SOCIAL.get(`devto:${i.id}`)) || "null") : "n/a",
        linkedin: i.linkedin ? JSON.parse((await env.SOCIAL.get(`li:${i.id}`)) || "null") : "n/a" });
    }
    return Response.json({ today: today(), pending_notes: await pendingNotes(env), items: rows });
  },
};
