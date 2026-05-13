// Cloudflare Pages Function — POST /api/contact
//
// Receives a contact form submission and forwards it via Resend.
// Replace with your provider of choice (Postmark, SES, Loops, …) — the
// shape stays the same.
//
// This file is ONLY active when deployed to Cloudflare Pages. On GitHub
// Pages there's no server, so the contact form falls back to a mailto:
// link (see src/components/Footer.astro for the link, and HUMAN.md for
// the static-only contact strategy).

interface Env {
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
}

interface Payload {
  name?: string;
  email?: string;
  message?: string;
  /** Honeypot field — bots fill this in, humans don't see it. */
  website?: string;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Payload;
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Honeypot — silent success.
  if (body.website) return json({ ok: true });

  const { name, email, message } = body;
  if (!name || !email || !message) {
    return json({ error: 'missing_fields' }, 400);
  }
  if (message.length > 5000) {
    return json({ error: 'message_too_long' }, 400);
  }

  const apiKey = ctx.env.RESEND_API_KEY;
  const to = ctx.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    // Not configured — accept the form so the UX still works, but log it.
    console.warn('contact form not configured — set RESEND_API_KEY and CONTACT_TO_EMAIL');
    return json({ ok: true, note: 'not_configured' });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Neofolio Contact <noreply@your-domain.com>',
      to,
      reply_to: email,
      subject: `Contact form: ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  });

  if (!res.ok) {
    return json({ error: 'send_failed' }, 502);
  }
  return json({ ok: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
