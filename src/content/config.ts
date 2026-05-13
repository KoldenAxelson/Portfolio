// ---------------------------------------------------------------------------
// Astro Content Collections — typed schemas for projects, posts, archive
//
// Drop new MDX/MD files into the matching subfolder and they'll show up
// automatically. Schemas are zod-validated at build time.
// ---------------------------------------------------------------------------

import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    /** Tier 1 = Featured (full case study). Tier 2 = Listed. Tier 3 = Archive. */
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    summary: z.string(),
    /** Tech tags. Standardize naming — see HUMAN.md tech tag vocabulary section. */
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
        case_study: z.string().url().optional(),
      })
      .default({}),
    /** Cover image for the project card. Relative to /public. */
    cover: z.string().optional(),
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
    /** If this post was syndicated, set the original canonical URL here. */
    canonical: z.string().url().optional(),
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

export const collections = { projects, posts, archive };
