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
    role: 'Founder & Independent Software Engineer',
    employer: 'Self-directed',
    location: 'Paso Robles, CA',
    start: '2025',
    end: 'present',
    startDate: '2025-02-01',
    summary:
      'Independent engineering across owned products, contract work, and self-funded experiments. Operating at the level the Government work prepared me for — without the formal level structure to label it.',
    highlights: [
      'Founder of VisorPlate (visorplate-us.com): one-product e-commerce store selling no-drill front-license-plate display solutions to car dealerships in bulk for white-label resale. Built from scratch; migrated from Laravel to Cloudflare Pages.',
      'Building Widda (widda.club): a monetization tool for YouTubers that lifts affiliate-link conversion.',
      'Delivered a contract website for YouTube studio BigHammerGarage (bighammergarage.com), launching this month.',
      'Pitched a farmers-market application for VC funding; pitch failed, but the process was the lesson.',
      'Built a Discord community and a custom bot using game-design principles — group accountability with a "casino points" carrot-and-stick loop.',
    ],
    stack: ['Cloudflare Pages', 'TypeScript', 'Laravel', 'Astro', 'Discord API'],
    thoughts: [],
  },
  {
    role: 'Lead DevOps Engineer',
    employer: 'UNCOMN LLC',
    location: 'Remote',
    start: '2020',
    end: '2025',
    startDate: '2020-01-01',
    endDate: '2025-01-31',
    summary:
      'Five-year span building secure, AWS-hosted systems for government and enterprise clients. Owned CI/CD, infrastructure hardening, and security review across multiple production projects in parallel.',
    highlights: [
      'Resolved 1,000+ Fortify-flagged security vulnerabilities on the CPA project — hardened application integrity end-to-end.',
      'Scripted and deployed the AWS Lambda + API Gateway layer that became the team pattern for Java/JavaScript services on Docker/Kubernetes.',
      'Built GitOps CI/CD on GitLab + ArgoCD, retiring the prior Jenkins-only pipeline.',
      'Ran code reviews, security reviews, and agile coordination with leadership and external clients.',
    ],
    stack: ['AWS', 'Java', 'Python', 'Kubernetes', 'GitLab', 'Fortify'],
    thoughts: [],
  },
  {
    role: 'Software Engineer',
    employer: 'Draftboard',
    location: 'Remote',
    start: '2018',
    end: '2019',
    startDate: '2018-03-01',
    endDate: '2019-09-30',
    summary:
      'Full-stack engineer on an iOS sports-drafting app. Took a half-finished product across the finish line; the company was acquired by DraftKings shortly after.',
    highlights: [
      'Drove a stalled iOS product to launch readiness; the company was acquired by DraftKings in 2019.',
      'Mentored junior developers and ran user-feedback iterations into the dev cycle.',
    ],
    stack: ['Swift', 'iOS', 'JavaScript'],
    thoughts: [],
  },
  {
    role: 'Software Engineer',
    employer: 'Cumulus Data Storage Solutions',
    location: 'Remote',
    start: '2015',
    end: '2018',
    startDate: '2015-11-01',
    endDate: '2018-01-31',
    summary:
      'Database and data-visualization engineer for retail clients, primarily on BevMo\'s point-of-sale systems.',
    highlights: [
      'Built an internal app that automated data charting for the BevMo team — eliminated a manual reporting workflow.',
      'Designed user-friendly visualizations of complex POS data to support decision-making.',
      'Transitioned to consultancy at the end of the contract to support long-term client relationships.',
    ],
    stack: ['SQL', 'JavaScript', 'Data Visualization'],
    thoughts: [],
  },
  {
    role: 'Software Engineer',
    employer: 'Neurotopia (SenseLabs LLC)',
    location: 'San Luis Obispo, CA',
    start: '2010',
    end: '2015',
    startDate: '2010-06-01',
    endDate: '2015-11-30',
    summary:
      'First professional role at an EEG neurotech startup. Owned the Ruby backend for the Neuro Headgear product, plus iPad games in Unity/Swift, plus the company website.',
    highlights: [
      'Developed and maintained the Ruby backend powering EEG Neuro Headgear — five-year ownership.',
      'Built interactive iPad games in Unity and Swift for user engagement and EEG training.',
      'Delivered talks at San Francisco conferences as a young engineer.',
      'Mentored interns through their first technical challenges in the role.',
    ],
    stack: ['Ruby', 'Unity', 'Swift', 'JavaScript'],
    thoughts: [],
  },
];

/** Education. Most-recent first. */
export const education: Degree[] = [
  {
    school: 'Cuesta College',
    degree: 'General College Coursework',
    year: '',
    notes: 'San Luis Obispo, CA',
  },
];

/**
 * Skills, grouped. The category names are arbitrary — change them.
 * Emitted as Person.knowsAbout in the /cv JSON-LD (flattened).
 */
export const skills: Record<string, string[]> = {
  Languages: ['Python', 'Java', 'JavaScript', 'Rust', 'Swift', 'Ruby', 'SQL'],
  'Cloud & Infra': ['AWS', 'Docker', 'Kubernetes', 'GitLab', 'ArgoCD', 'Fortify'],
  Web: ['React', 'HTML', 'CSS', 'Full-Stack Development'],
  Practices: ['Mentorship', 'Public Speaking', 'Agile / Scrum', 'Security', 'Incident Response'],
};
