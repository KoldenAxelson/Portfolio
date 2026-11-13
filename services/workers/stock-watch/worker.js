// Restock alerts for wrightfunctions.com: every few minutes it checks the
// products Tech Watch lists as sold out and emails Konrad when one is back.
//
// The watch list is the Tech Watch entries with a `restock:` field in
// data/tech-watch/items.yaml. scripts/stock-watch/deploy.py turns them into
// PRODUCTS at deploy time, so watching a new product is a line in that file
// and `make stock-deploy`. The one kind of check so far is "shopify": a
// Shopify store answers <product url>.js with the product as JSON, and
// `available` is true when any variant can be bought.
//
// KV (STOCK) remembers which products have had their email, so a restock is
// one email, not one per run. Selling out again clears it, so the next
// restock emails again. A failed check or a failed email changes nothing,
// and the next run tries again. Bindings and secrets are set by the deploy:
//
//   STOCK        KV namespace
//   MAILER       send_email binding (shared/mail.js)
//   RUN_KEY      secret, sent as "Authorization: Bearer <key>" to /run, /status and /test
//   PRODUCTS     JSON: [{ id, name, url, check }]
//   MAIL_FROM, MAIL_TO   plain vars

import { esc, sendEmail } from "../shared/mail.js";

const UA = "wrightfunctions-stock-watch/1.0 (+https://wrightfunctions.com/misc/tech-watch/)";
const GREEN = "#037737";

const CHECKS = {
  async shopify(product) {
    const res = await fetch(`${product.url}.js`, { headers: { "User-Agent": UA }, cf: { cacheTtl: 0 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { isAvailable: data.available === true, price: formatCents(data.price, data.currency) };
  },
};

function formatCents(cents, currency = "USD") {
  if (typeof cents !== "number") return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function products(env) {
  return JSON.parse(env.PRODUCTS || "[]");
}

async function checkStock(product) {
  const check = CHECKS[product.check];
  if (!check) throw new Error(`unknown check "${product.check}"`);
  return check(product);
}

// ---- The email -----------------------------------------------------------

function emailHtml(product, stock, note) {
  return `<!doctype html><html><body style="margin:0;padding:24px 16px;background:#ffffff">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto">
<tr><td style="padding:0 0 24px">
  <p style="margin:0 0 6px;font:600 12px/1.4 -apple-system,Segoe UI,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Back in stock${stock.price ? ` · ${esc(stock.price)}` : ""}</p>
  <p style="margin:0 0 14px;font:700 20px/1.35 -apple-system,Segoe UI,Arial,sans-serif;color:#111">${esc(product.name)}</p>
  <a href="${esc(product.url)}" style="display:block;padding:16px 20px;border-radius:12px;background:${GREEN};color:#fff;text-align:center;text-decoration:none;font:700 17px/1.2 -apple-system,Segoe UI,Arial,sans-serif">Open the store page</a>
  ${note ? `<p style="margin:14px 0 0;font:13px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#374151">${esc(note)}</p>` : ""}
</td></tr>
<tr><td style="padding-top:8px;border-top:1px solid #e5e7eb;font:12px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#9ca3af">Sent by the wrightfunctions.com stock-watch Worker. Tech Watch still lists it as sold out until data/tech-watch/items.yaml changes.</td></tr>
</table></body></html>`;
}

function emailText(product, stock, note) {
  return `${product.name} is back in stock${stock.price ? ` at ${stock.price}` : ""}.\n${product.url}\n${note ? `\n${note}\n` : ""}`;
}

async function emailRestock(env, product, stock, note = "") {
  const subject = `${note ? "Test: " : ""}Back in stock: ${product.name}`;
  await sendEmail(env, subject, emailHtml(product, stock, note), emailText(product, stock, note));
}

// ---- The run -------------------------------------------------------------

async function checkOne(env, product) {
  const key = `emailed:${product.id}`;
  const stock = await checkStock(product);
  const emailedAt = await env.STOCK.get(key);
  if (!stock.isAvailable) {
    if (emailedAt) await env.STOCK.delete(key);
    return { id: product.id, available: false };
  }
  if (emailedAt) return { id: product.id, available: true, emailed: emailedAt };
  await emailRestock(env, product, stock);
  const now = new Date().toISOString();
  await env.STOCK.put(key, now);
  return { id: product.id, available: true, emailed: now, sentNow: true };
}

async function run(env) {
  const results = [];
  for (const product of products(env)) {
    try { results.push(await checkOne(env, product)); }
    catch (err) {
      console.error(`stock check for ${product.id} failed`, err);
      results.push({ id: product.id, error: String(err.message || err) });
    }
  }
  return results;
}

async function status(env) {
  const rows = [];
  for (const product of products(env)) {
    const row = { id: product.id, name: product.name, check: product.check, emailed: await env.STOCK.get(`emailed:${product.id}`) };
    try { Object.assign(row, await checkStock(product)); }
    catch (err) { row.error = String(err.message || err); }
    rows.push(row);
  }
  return rows;
}

// ---- Entry points --------------------------------------------------------

async function authorized(request, env) {
  const given = new TextEncoder().encode((request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""));
  const expected = new TextEncoder().encode(env.RUN_KEY || "");
  return given.byteLength === expected.byteLength && expected.byteLength > 0 && crypto.subtle.timingSafeEqual(given, expected);
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env));
  },

  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!["/run", "/status", "/test"].includes(pathname) || !(await authorized(request, env))) {
      return new Response("Not found", { status: 404 });
    }
    if (pathname === "/run") return Response.json(await run(env));
    if (pathname === "/status") return Response.json(await status(env));
    // /test: the email the first watched product would send, whatever its
    // stock, with its live price. Records nothing.
    const product = products(env)[0];
    if (!product) return Response.json({ sent: false, reason: "nothing is watched" });
    const stock = await checkStock(product);
    await emailRestock(env, product, stock, "This is a test. The product may still be sold out, and nothing was recorded.");
    return Response.json({ sent: true, id: product.id, available: stock.isAvailable });
  },
};
