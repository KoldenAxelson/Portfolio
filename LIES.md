# LIES.md

Things in this portfolio that are aspirational, placeholder, or otherwise not yet true. Track them here so they don't ship as-is forever.

> Not committed to public deployment unless you want it to be. Either git-ignore this file (recommended — recruiters reading the repo source need not see the list) or just delete before the final push if you'd rather. Currently committed for AI-assistant continuity.

## Currently shipped as a lie

### Twitter handle `@KoldenAxelson`

Set in `src/config.ts` as `author.handle`. Emits `<meta name="twitter:creator" content="@KoldenAxelson">` on every page. **There is no Twitter/X account at this handle.** A scraper following the meta tag hits a non-existent profile.

To fix, either:
- Create the X profile and claim the handle, then also set `SITE.links.twitter` to the URL (currently `''`)
- Change `author.handle` to a handle you do own
- Set `author.handle: ''` and audit `SEO.astro` — it may emit `twitter:creator` unconditionally and need a guard

## Pending — deliberately left blank, fill in later

### Résumé content stops Jan 2025

The PDF and DOCX in `public/` exist and the download buttons on `/cv` are wired up to them. But the document content ends with the UNCOMN role in January 2025 — no VisorPlate, no Widda, no BigHammerGarage, no independent work. Recruiters who click the download see a stale picture. Update the source résumé and re-export both formats.

### OG default image (`public/og-default.png`)

Still the Neofolio template's default placeholder. Every social share of wrightfunctions.com — Twitter, LinkedIn, Discord, Slack — shows that generic image. Replace with a 1200×630 PNG that represents your brand. Once replaced, `DEFAULT_OG_IMAGE = '/og-default.png'` in `src/config.ts` already points at it.

### `Principal Software Engineer` — title structure

`src/config.ts` sets `author.role: 'Principal Software Engineer'`. The most-recent role in `cv.ts` is now `Founder & Independent Software Engineer` covering Jan 2025 → present, so the homepage role and CV top-line *don't* match by title — but they're describing different things (claimed level vs. current employment shape).

The résumé file in `public/` is also out of date — it ends at UNCOMN in Jan 2025 and doesn't reflect the independent work, the VisorPlate business, the contract for BigHammerGarage, or anything since. Recruiters who download the résumé will see a stale picture. Either:

- Update the résumé to reflect Jan 2025 → present and add a "VisorPlate", "Widda", and "BigHammerGarage" project block, OR
- Remove the résumé downloads from `/cv` (set `author.resume.pdf = ''` and `.docx = ''` again until it's current), OR
- Leave it as a snapshot of "last formal employment" and trust that the live site fills in the rest. Add a one-line "current work" line at the top of the résumé if so.

The title-claim ("Principal") itself is defensible based on the justification you gave — solo-operator delivering at that scope. Independent operators self-title at the level they're actually working at all the time. Just make sure you can tell that story when asked.

### Highlight bullets in `cv.ts` are mostly verb-driven, not number-driven

Most of the auto-extracted bullets read as `<verb> <adjective> <noun>` (`Built an internal app that automated...`, `Mentored junior developers...`). The runbook explicitly pushes for `<verb> <number> <noun>` (`closed 4 engineers in 9 months`, `cut p99 latency 70%`). The UNCOMN role has one real number (`1,000+ vulnerabilities`); the other three roles have none. Worth a second pass on each role to fish out actual metrics — anything quantifiable from product impact, scale, throughput, headcount, customers reached.

### `thoughts: []` on every cv role

The chat-bubble indicator on the homepage doesn't surface for any role yet because all `thoughts` arrays are empty. This is intentional — the résumé can't generate them; only you can. Voice should be off-resume: "Hiring four people in nine months is what aged me, not the failover system." 1–3 per role.

### Education year missing

Cuesta College "General College Coursework" entry has `year: ''`. The /cv education block renders cleanly with empty year, but if you remember the period (single year or `2008–2010` etc.), fill it in.

### CompTIA Security+ `issueDate` is estimated

The résumé says "Active July 2026" — that's the expiration. CompTIA Sec+ is valid for 3 years, so the `issueDate` in `src/content/certificates/comptia-security-plus.yaml` is set to `2023-07-01` as a best guess. Replace with the actual issue date from your CompTIA account before this ships to recruiters.

Also: `expirationDate` is set to `2026-07-01` — confirm the exact day.

### CompTIA `verifyUrl` is the generic verification portal

`https://www.certmetrics.com/comptia/public/verification.aspx` is CompTIA's public verification landing page, not a direct link to your specific credential. Recruiters paste your credential ID there. If CompTIA gives you a direct deep link (some credentialing systems do), swap it in.

### Template badges still in `public/badges/`

The Neofolio template ships four badge PNGs in `public/badges/`:

- `aws-solutions-architect.png`
- `k8s-app-dev.png`
- `security-plus.png` (kept — you actually have Sec+)
- `terraform-associate.png`

Three of those aren't yours. Either pick up the certs (the badges are then real) or delete the unused files. Currently they're not referenced by any `src/content/certificates/*.yaml`, so they don't ship to the live page — but they do still bloat the repo and confuse anyone browsing the source.

```bash
# If none of the other three are yours:
rm public/badges/{aws-solutions-architect,k8s-app-dev,terraform-associate}.png
```

### "Community as Infrastructure" cover image is 57 KB, target is 30 KB

Downloaded from the Dev.To original and converted to WebP in-sandbox via ImageMagick. Ended up at 57 KB, not the docs' ≤30 KB target — ImageMagick's WebP encoder is less efficient than the official `cwebp` binary. Acceptable but worth re-optimizing on your machine:

```bash
cwebp -q 75 public/covers/community-as-infrastructure.webp -o public/covers/community-as-infrastructure.webp
# Also: a 1.7 MB community-as-infrastructure.png is still in public/covers/ —
# the sandbox couldn't delete it. Clean it up:
rm public/covers/community-as-infrastructure.png
```

### Favicon switched to "K", but it's still the template's amber tile

`public/favicon.svg` now reads "K" instead of "N". Background is still the Neofolio template's `#9a3412` (burnt orange). If you have a personal mark or want a different color, swap it. The amber works fine for now — it's not a lie, just inherited template aesthetic.

### Other Neofolio template content artifacts

- `public/og-default.png` — Neofolio template default. Still ships as the OG card image for every page until replaced with a 1200×630 PNG that represents your brand.
- `public/favicon.svg` — amber tile with the letter "N" for Neofolio. Should be "K" or your monogram. Quick SVG edit.

## Things that will be added as we walk through later phases

Each phase of `SETUP_AGENT.md` introduces content that may or may not be fully true on first draft. Expect to add to this file as we go through:

- **Phase 2** — work history (`src/data/cv.ts`). Easy to inflate scope, drop unflattering gaps, or round dates. Track anything you're not 100% comfortable defending.
- **Phase 3** — projects. Especially the `metric:` field on Tier-1 projects ("★ 612 stars") and the archive entries' "honest postmortem" lines. Vanity stats decay; old GitHub stars get inflated.
- **Phase 4** — articles. `pubDate` and `canonical:` should reflect reality. Drafts (`draft: true`) don't ship.
- **Phase 5** — certifications. `expirationDate` matters — recruiters check. Don't list lapsed creds as active.
- **Phase 6** — network contacts. The `relationship:` field is the easiest to embellish. If someone listed wouldn't actually vouch for you, they shouldn't be on the page.
