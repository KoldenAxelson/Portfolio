// names.ts — the hardcoded dummy name pool used to pad the live name list and to
// fall back to entirely if the Worker fetch fails. Kept client-side (in addition
// to the Worker's own copy) precisely so the game still works fully offline /
// when the names API is unreachable.

export const DUMMY_NAMES: string[] = [
  // Recruiter-style (first name + last initial)
  'James R.', 'Sarah K.', 'Priya M.', 'Derek H.', 'Michelle T.', 'Brandon L.',
  'Ashley W.', 'Kevin O.', 'Natalie F.', 'Tyler B.', 'Rachel S.', 'Marcus J.',
  'Jennifer C.', 'Ryan P.', 'Danielle N.', 'Chris A.', 'Stephanie G.', 'Andrew V.',
  'Lauren E.', 'Jason D.', 'David H.', 'Megan R.', 'Patrick L.', 'Olivia T.',
  'Sean M.', 'Amanda B.', 'Kyle Z.', 'Brittany F.', 'Nathan C.', 'Caitlin W.',
  'Trevor J.', 'Monica S.', 'Garrett P.', 'Vanessa K.', 'Austin R.', 'Heather D.',
  'Logan N.', 'Tiffany A.', 'Blake E.', 'Amber O.', 'Justin M.', 'Samantha L.',
  'Connor H.', 'Kayla B.', 'Zachary F.', 'Lindsey C.', 'Ian T.', 'Rebecca G.',
  'Dustin W.', 'Alexis J.',
  // Company names
  'Raytheon', 'Lockheed Martin', 'Palantir', 'Booz Allen', 'SAIC', 'Leidos',
  'Northrop Grumman', 'General Dynamics', 'ManTech', 'CACI', 'Perspecta',
  'Accenture Federal', 'Deloitte', 'L3Harris', 'BAE Systems', 'Boeing', 'Textron',
  'DXC Technology', 'Unison', 'Maximus', 'Amentum', 'Parsons', 'Engility', 'KEYW',
  'Alion', 'Noblis', 'Jacobs', 'Peraton', 'SciTec', 'Torch Technologies',
];
