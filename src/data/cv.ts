// ---------------------------------------------------------------------------
// CV data — single source of truth for work history, education, skills.
//
// This file is imported by:
//   • src/pages/cv.astro   — renders the full résumé page
//   • src/pages/index.astro — renders a 3-entry summary on the homepage
//   • src/pages/cv.astro   — emits Person.hasOccupation JSON-LD so an AI
//                            can read your job history as structured data,
//                            not just prose
//
// Forkers: edit THIS file. Don't duplicate the data into the page files.
// ---------------------------------------------------------------------------

export interface Role {
  /** Job title, exactly as you'd want it on a résumé. */
  role: string;
  /** Employer / org name. */
  employer: string;
  /** "Remote", "City, ST", "Hybrid · City, ST", etc. */
  location: string;
  /** Year started — YYYY. */
  start: string;
  /** Year ended — YYYY or 'present'. */
  end: string;
  /** Optional ISO start date (YYYY-MM-DD). Improves hasOccupation schema. */
  startDate?: string;
  /** Optional ISO end date (YYYY-MM-DD). Omit if current. */
  endDate?: string;
  /** One- to two-sentence narrative summary. */
  summary: string;
  /** Bulleted highlights. Be specific. Numbers > adjectives. */
  highlights: string[];
  /** Tech used in the role. Plain text, shown as <code> chips. */
  stack: string[];
  /** Salary range string for hasOccupation.estimatedSalary. Optional. */
  estimatedSalary?: string;
  /**
   * Personal asides for the homepage typewriter — surfaced when this role's
   * BioIndicator is the active one. Voice should be human, off-resume.
   * Keep each entry to one to three sentences. Add 1–3 per role.
   * Omit (or empty array) to skip the indicator on this role.
   */
  thoughts?: string[];
}

export interface Degree {
  school: string;
  degree: string;
  year: string;
  /** Optional thesis title, honors, GPA, etc. */
  notes?: string;
}

/**
 * Work history. Most-recent first.
 *
 * Roles are emitted as Person.hasOccupation in the /cv JSON-LD, which is
 * what knowledge graphs key off of when an AI asks "what does this person do?"
 */
export const experience: Role[] = [
  {
    role: 'Tech Lead, Platform Team',
    employer: 'Example Corp',
    location: 'Remote',
    start: '2024',
    end: 'present',
    startDate: '2024-01-01',
    summary:
      'Lead engineer on the platform team. Designed the multi-region failover system that now handles 12M requests/day.',
    highlights: [
      'Migrated billing pipeline from monolith to event-driven Kafka topology — cut p99 latency 70%.',
      'Owned hiring for the team; closed 4 engineers in 9 months.',
      'Authored the on-call playbook adopted by 3 other platform-adjacent teams.',
      'Designed the schema-registry contract-test pattern used across 14 services.',
    ],
    stack: ['Go', 'Kafka', 'Postgres', 'AWS', 'Terraform'],
    thoughts: [
      "The 12M req/day number is real, but it'd be more honest as 12M-and-occasionally-7M. Seasonal traffic.",
      "Hiring four people in nine months is what aged me, not the failover system.",
      "The on-call playbook started as a Google Doc I wrote at 3am during my first incident here.",
    ],
  },
  {
    role: 'Senior Software Engineer',
    employer: 'Example Corp',
    location: 'Remote',
    start: '2023',
    end: '2024',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    summary:
      'Joined as a senior IC, promoted to tech lead after the platform reorg. Shipped the v2 event-replay system.',
    highlights: [
      'Owned the design and rollout of customer-facing event-replay tooling — 280+ enterprise customers.',
      'Mentored two junior engineers through their first production incident postmortems.',
    ],
    stack: ['Go', 'TypeScript', 'Postgres'],
    thoughts: [
      "I learned more from those mentee postmortems than they did. They asked the questions I'd stopped asking.",
      "Event-replay was the project where I finally understood what 'idempotent' really means in production.",
    ],
  },
  {
    role: 'Software Engineer',
    employer: 'Previous Co',
    location: 'Hybrid · Boston, MA',
    start: '2020',
    end: '2023',
    startDate: '2020-01-01',
    endDate: '2022-12-31',
    summary:
      'Backend engineer on the data ingest team. Owned the schema-evolution layer and the customer-facing event-replay tooling.',
    highlights: [
      'Designed schema-registry-backed contract testing system that prevented 6 production incidents.',
      'Rewrote ingest worker pool — 3× throughput on same hardware.',
      'Reduced incident MTTR from 47min to 14min across the team after introducing the incident-response bot.',
    ],
    stack: ['Python', 'Postgres', 'Redis', 'Terraform'],
    thoughts: [
      "The 3× throughput rewrite was a one-night thing that I spent six weeks reviewing before merging. Worth it.",
      "We had a cake when MTTR crossed under 20 minutes. We did not have a cake when it crossed under 14.",
    ],
  },
  {
    role: 'Systems Engineer (Cleared)',
    employer: 'Defense contractor (details on request)',
    location: 'On-site, SCIF',
    start: '2016',
    end: '2020',
    startDate: '2016-01-01',
    endDate: '2019-12-31',
    summary:
      'Four years building auditable, failure-tolerant systems under formal change-control and security-classification regimes. Specifics under NDA.',
    highlights: [
      'Order-of-magnitude scale: hundreds of users, millions of requests/day, four-nines uptime requirement.',
      'Worked under formal change-control with multi-stakeholder code review.',
      'Cleared for work in environments where bugs have downstream consequences far beyond the system.',
    ],
    stack: ['Details on request'],
    thoughts: [
      "Four years without a phone notification rewires you. I still flinch when something dings at the wrong time.",
      "I can talk about systems design from this era. I cannot talk about much else. The line is bright and I respect it.",
    ],
  },
];

/** Education. Most-recent first. */
export const education: Degree[] = [
  {
    school: 'State University',
    degree: 'B.S. Computer Science',
    year: '2016',
    notes: 'Honors thesis on distributed consensus protocols.',
  },
];

/**
 * Skills, grouped. The category names are arbitrary — change them.
 * Emitted as Person.knowsAbout in the /cv JSON-LD (flattened).
 */
export const skills: Record<string, string[]> = {
  Languages: ['TypeScript', 'Go', 'Python', 'SQL', 'Bash'],
  'Systems & Infra': [
    'Distributed systems',
    'Event-driven architecture',
    'Postgres internals',
    'Kafka',
    'Kubernetes',
  ],
  Cloud: ['AWS', 'Cloudflare', 'Terraform'],
  Practices: ['Code review', 'Hiring', 'Mentorship', 'Incident response'],
};
