// Email from a Worker to Konrad through a send_email binding, shared by the
// Workers under services/workers/ (social/, stock-watch/). Each deploy uploads
// this file beside the Worker as "shared/mail.js" (upload() in
// scripts/cloudflare/workers_api.py), so `import … from "../shared/mail.js"`
// resolves the same on Cloudflare as in the repo.
//
// sendEmail reads three things from env, set by the deploy scripts:
//   MAILER     send_email binding, locked to Konrad's verified address
//   MAIL_FROM  an address on wrightfunctions.com (Email Routing)
//   MAIL_TO    the verified destination

import { EmailMessage } from "cloudflare:email";

const SUBJECT_CHUNK = 45; // bytes per RFC 2047 encoded-word, so each stays under 75 characters

export function esc(s) {
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

export async function sendEmail(env, subject, html, text) {
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
