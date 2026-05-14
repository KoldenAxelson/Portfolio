// ---------------------------------------------------------------------------
// Astro Content Collections — typed schemas for projects, posts, archive,
// network, and certificates.
//
// Drop new MDX/MD/YAML files into the matching subfolder and they'll show
// up automatically. Schemas are zod-validated at build time.
// ---------------------------------------------------------------------------

import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    /** Tier 1 = Featured (full case study). Tier 2 = Listed. Tier 3 = Archive. */
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    summary: z.string(),
    /** Tech tags. Standardize naming — see docs/content.md tech tag vocabulary section. */
    tags: z.array(z.string()).default([]),
    /** Stack used to build the thing. Plain text, shown as <code> chips. */
    stack: z.array(z.string()).default([]),
    role: z.string().optional(),
    /** Year started — string so "2022–present" works too. */
    year: z.string(),
    status: z.enum(['shipped', 'in-progress', 'abandoned', 'classified']).default('shipped'),
    /** Public links. Omit any that don't apply. */
    links: z
      .object({
        live: z.string().url().optional(),
        repo: z.string().url().optional(),
      })
      .default({}),
    /**
     * Vanity metric. Shown as a small linked label on the project card.
     * Examples:
     *   { label: '★ 612 stars', href: 'https://github.com/.../stargazers' }
     *   { label: '↓ 12k downloads', href: 'https://npmjs.com/...' }
     *   { label: '4.8 ★ on Marketplace', href: 'https://marketplace...' }
     * The card itself is a link to the project — the metric is a SEPARATE
     * link that typically points at source code, a stats page, or reviews.
     * Omit entirely if there's nothing worth measuring.
     */
    metric: z
      .object({
        label: z.string(),
        href: z.string().url(),
      })
      .optional(),
    /** Cover image path, relative to /public. Optional. */
    cover: z.string().optional(),
    /**
     * Personal asides for the homepage typewriter — surfaced when this
     * project's BioIndicator is the active one. Voice should be human,
     * off-resume. One to three sentences each. Add 1–3 entries.
     * Empty array = no indicator on this card.
     */
    thoughts: z.array(z.string()).default([]),
    /** If true, projects show on the homepage hero strip. Tier 1 only. */
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Optional cover image path, relative to /public. */
    cover: z.string().optional(),
    /** If this post was syndicated, set the original canonical URL here. */
    canonical: z.string().url().optional(),
    /**
     * Personal asides for the homepage typewriter — surfaced when this
     * post's BioIndicator is the active one. Voice should be human,
     * off-resume. One to three sentences each. Add 1–3 entries.
     * Empty array = no indicator on this article entry.
     */
    thoughts: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const archive = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    year: z.string(),
    /** One-sentence post-mortem. "Abandoned when X happened." */
    postmortem: z.string(),
    stack: z.array(z.string()).default([]),
    /** Why this is here, in your own words. */
    reason: z.enum(['abandoned', 'superseded', 'classified', 'archived']).default('abandoned'),
  }),
});

const network = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    /** Job title or role. Used in the right-panel selector list. */
    title: z.string(),
    company: z.string().optional(),
    /** One- to three-sentence bio. Shown in the mini-profile pane. */
    blurb: z.string(),
    /** How you know this person. Helps the recruiter understand the relationship. */
    relationship: z.string(),
    /** Website / LinkedIn / YouTube — wherever the recruiter can verify them. */
    link: z.string().url().optional(),
    /** Display order. Lower = higher in the selector list. */
    order: z.number().default(100),
  }),
});

/**
 * Certificates / professional credentials.
 *
 * Each entry is emitted as a schema.org `EducationalOccupationalCredential`
 * on the /certificates page (as items in an `ItemList`) AND as an entry in
 * `Person.hasCredential` on /cv — so an AI walking your CV's structured
 * data can reach the credential, and an AI walking the credentials page
 * can resolve back to you via the `recognizedBy` Organization graph.
 *
 * One YAML file per certificate. Sort order on the page is by issueDate
 * descending (most recent first).
 */
const certificates = defineCollection({
  type: 'data',
  schema: z.object({
    /** Full credential name as it appears on the issued certificate. */
    name: z.string(),
    /** Issuing organization — e.g. "Amazon Web Services", "HashiCorp", "Google". */
    issuer: z.string(),
    /** Issuer's homepage. Used in the JSON-LD Organization for entity resolution. */
    issuerUrl: z.string().url().optional(),
    /** Date the credential was awarded (ISO date in YAML — e.g. 2025-04-15). */
    issueDate: z.coerce.date(),
    /** Optional expiration date. Omit for credentials that don't expire. */
    expirationDate: z.coerce.date().optional(),
    /** Credential ID / serial number, if the issuer provides one. */
    credentialId: z.string().optional(),
    /** Public verification URL. Recruiter clicks this to confirm authenticity. */
    verifyUrl: z.string().url().optional(),
    /** Path to badge image, relative to /public. Optional. */
    badge: z.string().optional(),
    /** One-line description of what the credential covers. Optional. */
    description: z.string().optional(),
    /**
     * Skills / competencies this credential demonstrates. Emitted as
     * `competencyRequired` on the credential schema and as a small text
     * list on the card. 3–6 items reads cleanly.
     */
    skills: z.array(z.string()).default([]),
    /**
     * Personal asides for the homepage typewriter — surfaced when this
     * certificate's BioIndicator is the active one. Voice should be human,
     * off-resume. One to three sentences each. Add 1–3 entries.
     * Empty array = no indicator on this card.
     */
    thoughts: z.array(z.string()).default([]),
    /** If true, shown on the homepage Certificates section. */
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, posts, archive, network, certificates };
