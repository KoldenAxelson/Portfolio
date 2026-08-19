// Everything the campaign pages keep in localStorage.
//
// A Warlord's maneuver list and a 1st-level character are both decided once and
// then referred to for months, so losing them on a refresh would make the widgets
// toys. Storage is best-effort in both directions: private browsing and a full
// quota throw on write, a hand-edited or stale value fails to parse on read, and
// the correct response to either is to keep working in memory rather than to
// break the page.
//
// SEPARATE KEYS, and versioned. The picker and the builder do not share a shape
// and should not share a blast radius — a bad character should not cost you your
// maneuvers. Bump the `-vN` suffix when a shape changes rather than writing a
// migration: these are two small local drafts, not records.

const MANEUVERS_KEY = 'dnd-maneuvers-v1';
const CHARACTER_KEY = 'dnd-character-v1';

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignored on purpose — see the note above.
  }
}

export function load(): Set<string> {
  const parsed = read(MANEUVERS_KEY);
  if (!Array.isArray(parsed)) return new Set();
  return new Set(parsed.filter((v): v is string => typeof v === 'string'));
}

export function save(picked: Set<string>): void {
  write(MANEUVERS_KEY, Array.from(picked));
}

/** The stored character, or null. Merged over a fresh state by the caller, so a
 *  value written by an older version yields a half-filled form rather than a
 *  crash — every field the caller reads has a default behind it. */
export function loadCharacter<T>(): Partial<T> | null {
  const parsed = read(CHARACTER_KEY);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed as Partial<T>;
}

export function saveCharacter(character: unknown): void {
  write(CHARACTER_KEY, character);
}
