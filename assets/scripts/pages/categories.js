/* categories — the shared domain model for the six argument categories the
 * classify/evaluate widgets use. One source of truth for what each category
 * entails (its mode, its validity/strength verdict, its soundness/cogency),
 * so no widget re-encodes those relationships.
 */
export var CATEGORIES = {
  'invalid':         { mode: 'deductive', verdict: 'invalid', quality: 'unsound'  },
  'valid-unsound':   { mode: 'deductive', verdict: 'valid',   quality: 'unsound'  },
  'valid-sound':     { mode: 'deductive', verdict: 'valid',   quality: 'sound'    },
  'weak':            { mode: 'inductive', verdict: 'weak',    quality: 'uncogent' },
  'strong-uncogent': { mode: 'inductive', verdict: 'strong',  quality: 'uncogent' },
  'strong-cogent':   { mode: 'inductive', verdict: 'strong',  quality: 'cogent'   }
};

var POSITIVE = { valid: 1, strong: 1, sound: 1, cogent: 1 };
function label(word) { return word.charAt(0).toUpperCase() + word.slice(1); }
function tone(word) { return POSITIVE[word] ? 'good' : 'bad'; }

/* The three summary pills: mode (neutral), validity/strength, soundness/cogency. */
export function pillsFor(cat) {
  var c = CATEGORIES[cat];
  if (!c) return [];
  return [
    { label: label(c.mode), tone: 'neutral' },
    { label: label(c.verdict), tone: tone(c.verdict) },
    { label: label(c.quality), tone: tone(c.quality) }
  ];
}

/* Just the soundness/cogency pill — Module 4 shows this one on its own. */
export function qualityPill(cat) {
  var c = CATEGORIES[cat];
  return c ? { label: label(c.quality), tone: tone(c.quality) } : null;
}
