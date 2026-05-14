# Certificates — adding a credential, end to end

What happens between "I just earned a cert" and "the badge shows up on the site, properly indexed for SEO." Three steps. No build-step gymnastics.

---

## Step 1 — Create the YAML

Drop a file at `src/content/certificates/<slug>.yaml`. The slug is the filename — pick something kebab-cased that reads well in a URL (`security-plus`, not `Security+ Cert`).

```yaml
name: 'CompTIA Security+ (SY0-701)'
issuer: 'CompTIA'
issuerUrl: 'https://www.comptia.org/certifications/security'
issueDate: 2024-02-12
expirationDate: 2027-02-12              # omit if perpetual
credentialId: 'COMP-EXAMPLE-2024'       # optional, public ID
verifyUrl: 'https://www.certmetrics.com/comptia/public/verification.aspx'
description: 'Vendor-neutral baseline for security operations.'
skills:
  - Threat detection + response
  - Cryptography concepts
featured: true                          # surfaces on the homepage strip
thoughts:
  - "Personal aside that drives the chat-bubble indicator on the homepage."
```

Required: `name`, `issuer`, `issueDate`. Everything else is optional. Full schema is in [`docs/content.md`](./content.md#certificates).

---

## Step 2 — Drop the badge image, run `make badges`

Save the badge file (download from Credly, the issuer's certification dashboard, or wherever the issuer hosts it) into the **`./badges/`** folder at the repo root. Any filename, any reasonable size.

Then:

```bash
make badges
```

This script:
1. Reads each file in `./badges/` with Sharp.
2. Slugifies the filename (`Security+ Badge.png` → `security-badge.png`).
3. If the image is over 1500px on either edge, resamples it down (preserves aspect, no cropping).
4. Re-encodes as optimized PNG with palette compression (typical 400KB → ~80KB).
5. Moves the result into `public/badges/`.
6. Prints the YAML line you need to paste, plus a hint about which cert YAML it likely belongs to.

Output looks like:

```
✓ Processed:
  security-plus: optimized, 412.8KB → 89.4KB
    → public/badges/security-plus.png  (1300×1100, 89.4KB)

Add to YAML frontmatter:
  # src/content/certificates/example-security-plus.yaml
  badge: '/badges/security-plus.png'
```

SVGs pass through untouched (vector — nothing to recompress).

---

## Step 3 — Add the `badge:` line to the cert YAML

Open the file the script suggested and paste in the printed line:

```yaml
verifyUrl: 'https://www.certmetrics.com/comptia/public/verification.aspx'
badge: '/badges/security-plus.png'      # ← here
description: '...'
```

Save. Reload your dev server. Done.

---

## What happens at build time (the invisible part)

For every cert with a `badge:` field, the build:

1. **Reads pixel dimensions via Sharp** (`src/lib/cert.ts → getBadgeImage()`). The actual `width` and `height` of `public/badges/<file>.png`.
2. **Constructs both a base-path-aware path AND an absolute URL.** Path goes into `<img src>` (works whether you deploy at root or under a base like `/portfolio`). Absolute URL goes into JSON-LD `image.url` (search engines + AI ingesters need a fully-qualified URL).
3. **Renders the badge in the row.** 40×40 thumbnail on the homepage, 48×48 on `/certificates`. Explicit `width`/`height` attributes prevent CLS.
4. **Emits a structured `ImageObject` in the JSON-LD** — `{ '@type': 'ImageObject', url, width, height }` — on both `/certificates` (inside the `ItemList`) AND on `/cv` (inside `Person.hasCredential`). The two share an `@id` so JSON-LD parsers merge them into one entity.

If a cert has NO `badge:` field, the row gets a Heroicons solid trophy on a faint tile — visually distinct from a badge image, signals "credential exists, badge not provided."

---

## SEO: what you get for free, what to verify

**Free** (just from following the three steps):
- `EducationalOccupationalCredential` JSON-LD on `/certificates` and `/cv`
- Issuer Organization linked via `recognizedBy` (with `url` if you set `issuerUrl`)
- Date validity via `validFrom` / `validUntil`
- Skills/competencies as `competencyRequired`
- Badge as full `ImageObject` with dimensions
- Entries in `/llms.txt` so LLM tool-use sees credentials immediately
- Bidirectional graph: `Person.hasCredential` ↔ `EducationalOccupationalCredential` (shared `@id`)

**Worth checking before declaring victory** (after `npm run build && npm run preview`):

```bash
# 1. The badge image actually loads
curl -sI http://localhost:4321/badges/security-plus.png | head -1
# → expect: HTTP/1.1 200 OK

# 2. JSON-LD parses cleanly and contains ImageObject with dimensions
curl -s http://localhost:4321/certificates \
  | grep -oE '<script type="application/ld\+json">[^<]+' \
  | python3 -c "import sys, json, re
for line in sys.stdin:
    obj = json.loads(re.sub(r'^<script[^>]+>', '', line))
    print(json.dumps(obj, indent=2))" \
  | grep -A4 'ImageObject'

# 3. llms.txt mentions the cert with verify URL
curl -s http://localhost:4321/llms.txt | grep -A1 'Active certifications'

# 4. /cv emits Person.hasCredential array
curl -s http://localhost:4321/cv \
  | grep -oE '<script type="application/ld\+json">[^<]+' \
  | grep -o 'hasCredential' | wc -l
# → expect: 1
```

For deployed sites, paste any cert page URL into [Google's Rich Results Test](https://search.google.com/test/rich-results). Credentials don't currently trigger a dedicated rich result type, but the validator confirms the schema parses with no spec violations.

---

## File locations cheat sheet

| Thing | Where |
|---|---|
| Cert YAML | `src/content/certificates/<slug>.yaml` |
| Badge source (pre-processing) | `./badges/` (root) — gitignore-able |
| Badge final location | `public/badges/<slug>.png` — committed |
| Process script | `scripts/optimize-badges.mjs` (runs via `make badges`) |
| Image / schema helpers | `src/lib/cert.ts` |
| Visual component | `src/components/CertBadge.astro` |
| Row layout | `src/components/CertRow.astro` |
| Homepage section | `src/pages/index.astro` (`<!-- CERTIFICATES -->`) |
| Full listing page | `src/pages/certificates.astro` |
| CV integration | `src/pages/cv.astro` (renders + emits `hasCredential`) |
