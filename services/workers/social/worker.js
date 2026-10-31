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
// twice and a missed day catches up the next morning. Bindings and secrets
// are set by scripts/social/deploy.py:
//
//   SOCIAL         KV namespace
//   MAILER         send_email binding, locked to Konrad's verified address
//   DEVTO_API_KEY  secret
//   RUN_KEY        secret, for /run and /status
//   QUEUE_URL, MAIL_FROM, MAIL_TO, PAGE_BASE   plain vars

import { EmailMessage } from "cloudflare:email";

const TZ = "America/Los_Angeles";
const UA = "wrightfunctions-social/1.0 (+https://wrightfunctions.com)";
const GREEN = "#037737";

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

function encodedWord(s) {
  return `=?UTF-8?B?${b64(s).replace(/\r\n/g, "")}?=`;
}

async function loadQueue(env) {
  const res = await fetch(`${env.QUEUE_URL}?t=${Date.now()}`, { headers: { "User-Agent": UA }, cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error(`queue: HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

async function isLive(url) {
  const res = await fetch(url, { method: "GET", headers: { "User-Agent": UA }, redirect: "follow" });
  return res.ok;
}

// ---- dev.to --------------------------------------------------------------

async function postToDevto(env, item) {
  const d = item.devto;
  const article = {
    title: d.title,
    body_markdown: d.body_markdown,
    published: true,
    description: d.description,
    tags: d.tags,
    canonical_url: d.canonical_url,
  };
  if (d.main_image) article.main_image = d.main_image;
  const res = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: {
      "api-key": env.DEVTO_API_KEY,
      "accept": "application/vnd.forem.api-v1+json",
      "content-type": "application/json",
      "User-Agent": UA,
    },
    body: JSON.stringify({ article }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`dev.to: HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text).url;
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
    `Subject: ${encodedWord(subject)}`,
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

async function run(env) {
  const day = today();
  const items = (await loadQueue(env)).filter((i) => i.date <= day);
  const linkedin = [];
  const notes = [];
  for (const item of items) {
    const devtoDue = item.devto && !(await env.SOCIAL.get(`devto:${item.id}`));
    const linkedinDue = item.linkedin && !(await env.SOCIAL.get(`li:${item.id}`));
    if (!devtoDue && !linkedinDue) continue;
    // Both posts link to the page, so neither goes out until it's live.
    if (!(await isLive(item.url).catch(() => false))) {
      notes.push(`Held "${item.title}": ${item.url} isn't live yet. It'll go out the first morning it is.`);
      continue;
    }
    if (devtoDue) {
      try {
        const url = await postToDevto(env, item);
        await env.SOCIAL.put(`devto:${item.id}`, JSON.stringify({ url, at: new Date().toISOString() }));
        notes.push(`dev.to: published "${item.title}": ${url}`);
      } catch (err) {
        notes.push(`dev.to: couldn't post "${item.title}" (it'll retry tomorrow): ${err.message}`);
      }
    }
    if (linkedinDue) linkedin.push(item);
  }
  if (linkedin.length || notes.length) {
    const subject = linkedin.length === 1 ? `LinkedIn post ready: ${linkedin[0].title}`
      : linkedin.length > 1 ? `${linkedin.length} LinkedIn posts ready`
      : "wrightfunctions.com posting report";
    await sendEmail(env, subject, emailHtml(env, linkedin, notes), emailText(env, linkedin, notes));
    for (const item of linkedin) await env.SOCIAL.put(`li:${item.id}`, JSON.stringify({ emailed: new Date().toISOString() }));
  }
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
    ctx.waitUntil(run(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const page = url.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/);
    if (page) {
      const item = (await loadQueue(env)).find((i) => i.id === page[1] && i.linkedin);
      if (!item) return new Response("Not found", { status: 404 });
      return new Response(copyPage(item), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    const authed = url.searchParams.get("key") && url.searchParams.get("key") === env.RUN_KEY;
    if (url.pathname === "/run" && authed) {
      return Response.json(await run(env));
    }
    if (url.pathname === "/status" && authed) {
      const items = await loadQueue(env);
      const rows = [];
      for (const i of items) {
        rows.push({ id: i.id, date: i.date, devto: i.devto ? JSON.parse((await env.SOCIAL.get(`devto:${i.id}`)) || "null") : "n/a",
                    linkedin: i.linkedin ? JSON.parse((await env.SOCIAL.get(`li:${i.id}`)) || "null") : "n/a" });
      }
      return Response.json({ today: today(), items: rows });
    }
    return new Response("Not found", { status: 404 });
  },
};
